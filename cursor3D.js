//cursor3D: natigate & manipulate in 3D
//requires numeric.js, VEC4.js,
//and frames.Frame.js
var Cursor3D = function(params){
  //params: { camera, renderer };
  this.LISTENING = false;

  this.frame = new frames.Frame();
  this.rot = [0, 0, 0, 1];
  //webGL the cursor is acting on
  this.camera = params.camera;
  this.renderer = params.renderer;

  this.STATE = {};
  this.STATE.ACT = false;
  this.STATE.AXIS = undefined;
  this.cache = {cursorq: undefined, cursor3D: { q: undefined, rot: undefined }};

  this.SCALE = {};
  this.SCALE.T = 1;
  this.SCALE.R = 1;
  this.SCALE.SHIFT = 1e-1;

  this.REQUEST_UPDATE = false;

  //attach handlers
  this.keydownHandler = function(e){ if(this.LISTENING){
    //e.preventDefault();
    if(KEYCHART[e.which] === 'R'
    || KEYCHART[e.which] === 'T'){
      this.STATE.ACT = KEYCHART[e.which]; //switch to appropriate state
      this.REQUEST_UPDATE = true;

      //remember initial state
      if(q === undefined){ /*do nothing*/ } else {
        this.cache.cursorq = [q[0], q[1]];
      }
      this.cache.cursor3D.q = VEC4.clone(this.frame.o);
      this.cache.cursor3D.rot = this.rot;
    }

    if(KEYCHART[e.which] === 'ESC'){ //e.preventDefault();
      this.set({ q: this.cache.cursor3D.q,
                 rot: this.cache.cursor3D.rot });
      this.STATE.ACT = false;
      this.STATE.AXIS = undefined;

      this.REQUEST_UPDATE = true;
    }

    if(this.STATE.ACT){
      if(KEYCHART[e.which] === 'X'
      || KEYCHART[e.which] === 'Y'
      || KEYCHART[e.which] === 'Z'){
        //clear rotation first to prevent composite rotation complications
        this.set({ q: this.cache.cursor3D.q,
                   rot: this.cache.cursor3D.rot });

        this.STATE.AXIS = this.frame[KEYCHART[e.which].toLowerCase()];
        //this.REQUEST_UPDATE = true;
      }
    }
  }};

  this.mouseupHandler = function(e){ if(this.LISTENING){
    //e.preventDefault();
    if(e.button === CLICK.LEFT.BUTTON){ //LMB up
      if(this.STATE.ACT){
        //actuate rotation/translation
        this.STATE.ACT = false;
        this.STATE.AXIS = undefined;
      }
      this.REQUEST_UPDATE = true;
    }
  }};

  var q = undefined; //q is out here for acces from key handlers
  this.mousemoveHandler = function(e){ if(this.LISTENING){
    //e.preventDefault();
    //calculate location of click
    var rect = this.renderer.domElement.getBoundingClientRect();
    q = [e.clientX-rect.left, e.clientY-rect.top]; //click coords in p

    if(this.STATE.ACT){ //in translation/rotation state.
      //get scene basis
      var sceneBasis = VEC4.sceneBasis({
        camera: this.camera,
        renderer: this.renderer,
        reference: this.frame.o });

      if (this.STATE.ACT === 'T'){  //translate
        if(this.cache.cursorq === undefined){ this.cache.cursorq = [q[0], q[1]]; }
        var dcursorq = [q[0]-this.cache.cursorq[0], q[1]-this.cache.cursorq[1]];
        var deltaq = VEC4.add(
          VEC4.mul( dcursorq[0], sceneBasis.x),
          VEC4.mul(-dcursorq[1], sceneBasis.y)
        );

        //if confined to axis, project.
        if(this.STATE.AXIS){
          deltaq = VEC4.mul(
            VEC4.dot(deltaq, this.STATE.AXIS),
            this.STATE.AXIS
          );
        }

        this.set({ q:
          VEC4.add(this.cache.cursor3D.q,
          deltaq)
        });

      } else if (this.STATE.ACT === 'R'){ //rotate

        if(this.cache.cursorq === undefined){ this.cache.cursorq = [q[0], q[1]]; }
        var dq = [q[0]-this.cache.cursorq[0], q[1]-this.cache.cursorq[1]];

        //calculate argument
        var o = VEC4.sceneToScreen({
        q: this.frame.o,
        camera: this.camera,
        renderer: this.renderer});

        var arg = VEC4.ang(
          [q[0]-o[0], q[1]-o[1], 0, 1], //current offset
          [this.cache.cursorq[0]-o[0],  //present offset
           this.cache.cursorq[1]-o[1], 0, 1],
          [0, 0, 1, 1]);                //screen normal

        var delta;
        if(this.STATE.AXIS){
          var sign = 1;
          if(VEC4.dot(this.STATE.AXIS, VEC4.unit(sceneBasis.z))< -1e-2){
            sign = -1;
          }
          delta = VEC4.mul(arg*sign, this.STATE.AXIS);
        } else {
          //use screen basis
          delta = VEC4.mul(arg, VEC4.unit(sceneBasis.z));
        }

        var T = numeric.dot(
              VEC4.axangToMat4(delta),                  //the increment
              VEC4.axangToMat4(this.cache.cursor3D.rot) //initial rotation
            );
        T = VEC4.mat4SetTranslate(T, this.cache.cursor3D.q);
        this.set({ T: T });
      }
      this.REQUEST_UPDATE = true;

    } else {
      if(e.buttons&CLICK.LEFT.BUTTONS){
        //LMB drag, drag the cursor along.
        this.setFromScreen(q);
        this.REQUEST_UPDATE = true;
      }
    }
  }};
  this.mousedownHandler = function(e){ if(this.LISTENING){
    //e.preventDefault();

    //calculate location of click
    var rect = this.renderer.domElement.getBoundingClientRect();
    var q = [e.clientX-rect.left, e.clientY-rect.top]; //click coords in p
    if(e.buttons&CLICK.LEFT.BUTTONS && !(this.STATE.ACT)){
      //LMB: move 3D cursor
      this.setFromScreen(q);
      this.REQUEST_UPDATE = true;
    }
  }};

  this.renderer.domElement.addEventListener('mousedown', this.mousedownHandler.bind(this));
  this.renderer.domElement.addEventListener('mouseup', this.mouseupHandler.bind(this));
  this.renderer.domElement.addEventListener('mousemove', this.mousemoveHandler.bind(this));
  window.addEventListener('keydown', this.keydownHandler.bind(this));

};
Cursor3D.prototype.setFromScreen = function(q){
  //set from screen coordinates, project to
  //maintain distance from camera

  //q: position of click, in px, wrt domElement

  var oldq = VEC4.sceneToScreen({                    //current cursor3D
    q: this.frame.o,
    camera: this.camera,
    renderer: this.renderer});

  //vector from camera to o
  var cameraToCursor = VEC4.sub(this.frame.o,
    VEC4.THREEvector3toVec4(this.camera.position));
  var cameraDirection = VEC4.unit(VEC4.THREEvector3toVec4(
    this.camera.getWorldDirection()
  ));

  var basis = VEC4.sceneBasis({
    camera: this.camera,
    renderer: this.renderer,
    distance: Math.abs(VEC4.dot(cameraToCursor, cameraDirection))
  });

  this.set({q:
    VEC4.add(this.frame.o,
      VEC4.add(
        VEC4.mul( q[0]-oldq[0], basis.x),
        VEC4.mul(-q[1]+oldq[1], basis.y)
      )
    )
  });
};
Cursor3D.prototype.set = function(params){
  //params: { q, rot }
  var T;
  if(params.T){
    T = params.T;
    this.rot = VEC4.mat4toAxang(T);

  } else {
    var q = params.q || this.frame.o;
    var rot = params.rot || this.rot;

    this.rot = rot;
    T = VEC4.axangToMat4(rot);
    T[0][3] = q[0];
    T[1][3] = q[1];
    T[2][3] = q[2];
  }
  this.frame.setTransform(T);
};
Cursor3D.prototype.increment = function(params){
  //params: { q, rot }
  var dq = params.q || [0, 0, 0, 1];
  var drot = params.rot || [0, 0, 0, 1];
  this.set({q: VEC4.add(this.frame.o, dq),
            rot: VEC4.add(this.rot, drot)});
}
Cursor3D.prototype.initVisual = function(params){
  //params: { scene }

  //init visual of auxiliary objects: frame
  this.frame.initVisual({ scene: params.scene });

  var scene = params.scene;

  this.visual = {};

  //constants determining appearance of cursor
  this.visual.ORIGIN_COLOUR = 0xffffff;
  this.visual.ORIGIN_SIZE = 0.01;
  this.visual.CIRCLE_RADIUS = 0.1;


  this.visual.origin = new THREE.Mesh(
    new THREE.CubeGeometry(this.visual.ORIGIN_SIZE,
                           this.visual.ORIGIN_SIZE,
                           this.visual.ORIGIN_SIZE),
    new THREE.MeshBasicMaterial({color: this.visual.ORIGIN_COLOUR })
  );
  scene.add(this.visual.origin);
};
Cursor3D.prototype.syncVisual = function(){
  //sync visual of auxiliary objects: frame
  this.frame.syncVisual();

  //position origin at centre of coordinate frame
  this.visual.origin.position.fromArray(this.frame.o);
  this.visual.origin.up = this.frame.visual.THREEq.z;
  this.visual.origin.lookAt(
    VEC4.vec4toTHREEvector3(VEC4.add(this.frame.o, this.frame.x))
  );
};
Cursor3D.prototype.update = function(force){
  if(this.REQUEST_UPDATE || force){
    this.syncVisual();
    this.REQUEST_UPDATE = false;
  }
};
Cursor3D.prototype.listen = function(t){ this.LISTENING = t; }
