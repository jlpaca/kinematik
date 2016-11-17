//kinematik monitor: window interface for editing DH-params & actuation
//part of kinematik.js, use with THREE.js


kinematik.Monitor = function(params){
  //params {domParent, renderer, camera, scene, kinematicChain}
  params = params || {};

  this.domParent = params.domParent || document.documentElement;

  this.renderer = params.renderer;
  this.camera = params.camera;

  //the kinematic chain that the monitor controls
  this.kinematicChain = params.kinematicChain;

  //individual windows that control individual joints
  this.panel = [];

  this.STATE = {};
  this.STATE.dragTarg = false;
  this.STATE.dragq = [0, 0];
  this.STATE.lastPanelq = [0, 0];
  //Draw the monitor for every link, start from frame 1 (frame 0 is always inertial)
  this.mapKinematicLink();

  //handle dragging
  this.mousemoveHandler = function(e){ //e.preventDefault();
    if((this.STATE.dragTarg !== false) && (e.buttons&CLICK.LEFT.BUTTONS)){
        var rect = this.domParent.getBoundingClientRect();
        var dq = [
          (e.clientX-rect.left) - this.STATE.dragq[0],
          (e.clientY-rect.top)  - this.STATE.dragq[1]
        ];
        this.STATE.dragTarg.domElement.style.left
        = (this.STATE.dragTarg.x + dq[0]) + 'px';
        this.STATE.dragTarg.domElement.style.top
        = (this.STATE.dragTarg.y + dq[1]) + 'px';
    }
  };
  this.domParent.addEventListener('mousemove', this.mousemoveHandler.bind(this));

};
kinematik.Monitor.prototype.initPanel = function(params, propagate){

  //params: {kinematicLink}
  var r = params.kinematicLink;
  if(!(r.child instanceof kinematik.KinematicLink)){ return; }

  //set up a window.

  var newPanel = {};
  newPanel.kinematicLink = r;

  //index in
  newPanel.i = this.panel.length+1;

  newPanel.h = 240;
  newPanel.w = 140;
  newPanel.x = this.STATE.lastPanelq[0];
  newPanel.y = this.STATE.lastPanelq[1];
  this.STATE.lastPanelq[0] += 144;

  //main window: create & position
  newPanel.domElement = document.createElement('div');
  newPanel.domElement.id = 'monitor-panel-'+newPanel.i;
  newPanel.domElement.className = 'monitor-panel';

  newPanel.domElement.style.left    = newPanel.x + 'px';
  newPanel.domElement.style.top     = newPanel.y + 'px';
  newPanel.domElement.style.width   = newPanel.w + 'px';
  newPanel.domElement.style.height  = newPanel.h + 'px';

  //title bar: create & append to window frame
  var domTitle = document.createElement('div');
  domTitle.className = 'monitor-panel-title';
  domTitle.innerHTML = '#' + newPanel.i;
  newPanel.domElement.appendChild(domTitle);

  //module visual: create & append to window frame
  var domModuleVisualHeader = document.createElement('div');
  domModuleVisualHeader.className = 'monitor-panel-module-header';
  domModuleVisualHeader.innerHTML = 'visualisation';

  var domModuleVisual = document.createElement('div');
  domModuleVisual.className = 'monitor-panel-module';
  domModuleVisual.innerHTML = 'PLACEHOLDAH';

  newPanel.domElement.appendChild(domModuleVisualHeader);
  newPanel.domElement.appendChild(domModuleVisual);


  //module-DH params: create & append to window frame
  var domModuleDHheader = document.createElement('div');
  domModuleDHheader.className = 'monitor-panel-module-header';
  domModuleDHheader.innerHTML = 'D-H parameters';

  var domModuleDH = document.createElement('div');
  domModuleDH.className = 'monitor-panel-module';
  domModuleDH.innerHTML = '<form id="DH'+newPanel.i+'" action="javascript:void(0);">' +

  '<p><label for="DH'+newPanel.i+'-d">d</label>'+
  '<input type="number" step="0.2" id="DH'+newPanel.i+'-d" ' +
  'disabled name="DH'+newPanel.i+'-d"></p>' +

  '<p><label for="DH'+newPanel.i+'-th">&#952;</label>'+
  '<input type="number" step="0.2" id="DH'+newPanel.i+'-th" ' +
  (newPanel.kinematicLink.jointType == kinematik.JOINT_TYPE.REVOLUTE ? ' ' : 'disabled ') +
  'name="DH'+newPanel.i+'-th"></p>' +

  '<p><label for="DH'+newPanel.i+'-d">r</label>'+
  '<input type="number" step="0.2" id="DH'+newPanel.i+'-r" ' +
  'disabled name="DH'+newPanel.i+'-r"></p>' +

  '<p><label for="DH'+newPanel.i+'-alf">&#945;</label>'+
  '<input type="number" step="0.2" id="DH'+newPanel.i+'-alf" ' +
  'disabled name="DH'+newPanel.i+'-alf"></p>' +
  '</form>';

  newPanel.domElement.appendChild(domModuleDHheader);
  newPanel.domElement.appendChild(domModuleDH);


  //attach whole window to parent
  this.domParent.appendChild(newPanel.domElement);

  //generate & attach handlers
  newPanel.startDrag = function(e){ //e.preventDefault();

    //NON-MODULAR SUPPRESOR to prevent
    //asynchronous messups
    USER.input.cursor3D.listen(false);

    var rect = this.domParent.getBoundingClientRect();
    this.STATE.dragq = [e.clientX-rect.left, e.clientY-rect.top];
    //click coords wrt parent

    this.STATE.dragTarg = newPanel;

    //bring to front
    this.domParent.removeChild(this.STATE.dragTarg.domElement);
    this.domParent.appendChild(this.STATE.dragTarg.domElement);

  };
  newPanel.stopDrag = function(e){ //e.preventDefault();

    //update window location to position window permanently here.
    //trim off px from string value (.slice(-2) removes last 2 chars)
    this.STATE.dragTarg.x =
    Number(this.STATE.dragTarg.domElement.style.left.slice(0, -2));
    this.STATE.dragTarg.y =
    Number(this.STATE.dragTarg.domElement.style.top.slice(0, -2));


    this.STATE.dragTarg = false;


    //NON-MODULAR SUPPRESOR to prevent
    //asynchronous messups
    USER.input.cursor3D.listen(true);

  };
  newPanel.toggle = function(e){
    if(e.button & CLICK.RIGHT.BUTTONS){
      newPanel.domElement.style.height =
        newPanel.domElement.style.height === '30px' ?
        newPanel.h + 'px' : '30px';
    }
  };
  domTitle.addEventListener('mousedown', newPanel.startDrag.bind(this));
  domTitle.addEventListener('mouseup', newPanel.stopDrag.bind(this));
  domTitle.addEventListener('mouseup', newPanel.toggle.bind(this));
  domTitle.addEventListener('contextmenu', function(e){e.preventDefault();});
  //register panel in Monitor array
  this.panel[this.panel.length] = newPanel;


  if(propagate && r.child instanceof kinematik.KinematicLink){
    this.initPanel({ kinematicLink: r.child }, true);
  }
};
kinematik.Monitor.prototype.update = function(force){
  //update monitor display

  for(var i = 0; i < this.panel.length; ++i){
    document.getElementById('DH'+(i+1)+'-d').value = this.panel[i].kinematicLink.DH.d.toFixed(3);
    document.getElementById('DH'+(i+1)+'-th').value = this.panel[i].kinematicLink.DH.th.toFixed(3);
    document.getElementById('DH'+(i+1)+'-r').value = this.panel[i].kinematicLink.DH.r.toFixed(3);
    document.getElementById('DH'+(i+1)+'-alf').value = this.panel[i].kinematicLink.DH.alf.toFixed(3);
  }


  return;
};
kinematik.Monitor.prototype.mapKinematicLink = function(params){
  var i = 0;
  for(var r = this.kinematicChain.child; r.child instanceof kinematik.KinematicLink; r = r.child){
    if(this.panel[i] !== undefined){
      //panel already exists
      //do nothing
    } else {
      //found a link without existing panel
      this.initPanel({kinematicLink: r}, false);
    }
    ++i
  }

};
