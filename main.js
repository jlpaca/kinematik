var WORLD = {};

WORLD.webGL = {};
WORLD.webGL.init = function(){
  //create webGL renderer and size to full window
  this.renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('viewport'),
    antialias: true
  });
  this.renderer.setClearColor(0x202020, 1);
  //create camera
  this.camera = new THREE.PerspectiveCamera(
                       45,
                       this.renderer.domElement.clientWidth/
                       this.renderer.domElement.clientHeight,
                       0.1, 10000
                     );
  //create scene and add camera to scene
  this.scene = new THREE.Scene();
  this.scene.add(this.camera);

  //References and other constants in scene:
  var XYplane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: 0x242424})); //0x242424
  this.scene.add(XYplane);

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  this.scene.add(ambientLight);
  this.scene.add(directionalLight);

  //handle resizing of webGL canvas, keep full window size.
  //WORLD.webGL.resize() is called every timestep.
  this.resize = function(){
   var w = document.getElementById('viewport-wrapper').clientWidth;//document.documentElement.clientWidth;
   var h = document.getElementById('viewport-wrapper').clientHeight;//document.documentElement.clientHeight;
   if(this.renderer.domElement.clientWidth !== w ||
     this.renderer.domElement.clientHeight !== h){
       //resize output canvas
       this.renderer.setSize(w, h);
       //adjust camera accordingly
       this.camera.aspect = w/h;
       this.camera.updateProjectionMatrix();
   }
  };

  //render scene through camera onto canvas
  this.render = function(){ this.renderer.render(this.scene, this.camera) };

  //suppress key & mouse events on canvas element
  this.keydownHandler = function(e){ e.preventDefault(); }
  this.contextmenuHandler = function(e){ e.preventDefault(); }
  this.renderer.domElement.addEventListener('keydown', this.keydownHandler);
  this.renderer.domElement.addEventListener('contextmenu', this.contextmenuHandler);

}; WORLD.webGL.init();



var ROBOT = new kinematik.KinematicLink({});


ROBOT.extend({ joint: { q: [0, 0, 0.1, 1],    axis: [0, 0, 1, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});

ROBOT.extend({ joint: { q: [0.14, 0, 0.2, 1], axis: [1, 0, 0, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});

ROBOT.extend({ joint: { q: [0.12, 0, 0.6, 1], axis: [1, 0, 0, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});
ROBOT.extend({ joint: { q: [0, 0.1, 0.6, 1],  axis: [0, 1, 0, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});
ROBOT.extend({ joint: { q: [0, 0.3, 0.6, 1],  axis: [1, 0, 0, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});
ROBOT.extend({ joint: { q: [0, 0.3, 0.6, 1],  axis: [0, 1, 0, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});
ROBOT.extend({ joint: { q: [0, 0.4, 0.6, 1],  axis: [0, 1, 0, 1], type: kinematik.JOINT_TYPE.REVOLUTE}});

ROBOT.initVisual({ scene: WORLD.webGL.scene }, true);
ROBOT.syncVisual(true);


var USER = {};

USER.input = {};
USER.input.init = function(){

  this.cursor = {
   q: [0, 0],                  //position relative to
   keys: [false, false, false]
  };

  //cursor3D: manipulate things in world space
  USER.input.cursor3D = new Cursor3D({ camera: WORLD.webGL.camera,
                                       renderer: WORLD.webGL.renderer });
  USER.input.cursor3D.initVisual({ scene: WORLD.webGL.scene });
  USER.input.cursor3D.syncVisual();
  USER.input.cursor3D.listen(true);

  //spherical camera controls: navigate viewport
  USER.input.sphericalCameraControls = new SphericalCameraControls({
    camera: WORLD.webGL.camera, renderer: WORLD.webGL.renderer,
    //ocalView: { NUM1: [0, -1, 0, 1], NUM3: [-1, 0, 0, 1], NUM7: [0, 0, -1, 1]},
    trackFrame: USER.input.cursor3D.frame
  });
  //set local coord frame to cursor frame: useful combined w/ transforms
  USER.input.sphericalCameraControls.listen(true);

  //kinematicBuilder: construct robot
  USER.input.kinematikBuilder = new kinematik.Builder({
    kinematicLink: ROBOT,
    cursor3D: USER.input.cursor3D });
  USER.input.kinematikBuilder.listen(true);

  //kinematicActuator: control robot
  USER.input.kinematikActuator = new kinematik.Actuator({ kinematicLink: ROBOT });
  USER.input.kinematikActuator.listen(true);

  //mode manager
  USER.input.modeManager = new ModeManager();

  //define specific timestep functions
  USER.input.modeManager.CONDITIONALS.IK = function(){
    //if in ik mode, solve inverse kinematics.
    kinematik.dampedLeastSquares({
      kinematicLink: ROBOT,
      target: USER.input.cursor3D.frame,
      lambda: 5e-3,
      iter: 512 });
  }

  //define actions when switching between modes
  USER.input.modeManager.SWITCH_ACTIONS.IK = function(){
    //disable everything else if solving ik
    USER.input.kinematikBuilder.listen(false);
    USER.input.kinematikActuator.listen(false);
  }
  USER.input.modeManager.SWITCH_ACTIONS.B = function(){
    //enable building
    USER.input.kinematikBuilder.listen(true);
    USER.input.kinematikActuator.listen(false);
  }
  USER.input.modeManager.SWITCH_ACTIONS.FK = function(){
    //enable joint actuation with keys
    USER.input.kinematikBuilder.listen(false);
    USER.input.kinematikActuator.listen(true);
  }
  //dummy switch to initial mode to ensure all parameters are set correctly
  USER.input.modeManager.SWITCH_ACTIONS[USER.input.modeManager.MODE]();

}; USER.input.init();




//timestep
var t = 0; var dt = 1e-2;
function timestep(){ t += dt;
  WORLD.webGL.resize();

  if(USER.input.modeManager.MODE !== 'B'){
    ROBOT.syncVisual(true);
  }

  USER.input.kinematikActuator.update();
  USER.input.kinematikBuilder.update();

  USER.input.cursor3D.update();
  USER.input.sphericalCameraControls.update();

  USER.input.modeManager.conditional();

  WORLD.webGL.render();
  window.requestAnimationFrame(timestep);
  //window.setInterval(timestep, 100);
};
timestep();
