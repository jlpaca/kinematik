//frames.js
//  references frames, translations,
//  frame visualisation.
//  requires VEC4.js and THREE.js for vis
var frames = {};
frames.Frame = function(params){
  //origin and unit vectors
  this.o = [0, 0, 0, 1];
  this.x = [1, 0, 0, 1];
  this.y = [0, 1, 0, 1];
  this.z = [0, 0, 1, 1];
};
frames.Frame.prototype.setTransform = function(T){
  //set frame as origin frame transformed by T
  this.o = numeric.dotMV(T, [0, 0, 0, 1]);
  this.x = VEC4.sub(numeric.dotMV(T, [1, 0, 0, 1]), this.o);
  this.y = VEC4.sub(numeric.dotMV(T, [0, 1, 0, 1]), this.o);
  this.z = VEC4.sub(numeric.dotMV(T, [0, 0, 1, 1]), this.o);
};
frames.Frame.prototype.pushTransform = function(T){
  //push transformation matrix T onto stack
  var newo = numeric.dotMV(T, this.o);
  this.x = VEC4.sub(numeric.dotMV(T, VEC4.add(this.o, this.x)), newo);
  this.y = VEC4.sub(numeric.dotMV(T, VEC4.add(this.o, this.y)), newo);
  this.z = VEC4.sub(numeric.dotMV(T, VEC4.add(this.o, this.z)), newo);
  this.o = newo;
};
frames.Frame.prototype.initVisual = function(params){
  //params: { scene }
  var scene = params.scene;

  this.visual = {};

  //defines size and position of axes.
  this.visual.AXIS_LENGTH = 0.08;
  this.visual.AXIS_THICKNESS = 0.004;
  this.visual.AXIS_OFFSET = 0.02;
  this.visual.CONE_LENGTH = 0.04;
  this.visual.CONE_THICKNESS = 0.02;
  this.visual.COLOURS = { x: 0xff0000, y:0x00ff00, z:0x0000ff };

  //initiate geometries according to parameters.
  var axisGeometry = new THREE.CubeGeometry(this.visual.AXIS_THICKNESS,
                                            this.visual.AXIS_THICKNESS,
                                            this.visual.AXIS_LENGTH);
  var coneGeometry = new THREE.ConeGeometry(this.visual.CONE_THICKNESS/2,
                                            this.visual.CONE_LENGTH, 8);


  //empty object containers for representations of each axis
  this.visual.x = {}; this.visual.y = {}; this.visual.z = {};

  //vectors in THREE.Vector3 format - reuse objects.
  this.visual.THREEq = {};
  this.visual.THREEq.o = new THREE.Vector3().fromArray(this.o);
  this.visual.THREEq.x = new THREE.Vector3().fromArray(this.x);
  this.visual.THREEq.y = new THREE.Vector3().fromArray(this.y);
  this.visual.THREEq.z = new THREE.Vector3().fromArray(this.z);

  //loop over each of the axes & create THREE.js objects
  var axes = ['x', 'y', 'z', 'x']; var j; var k;
  for(var i = 0; i < 3; ++i){
    j = axes[i]; k = axes[i+1];
    this.visual[j].axis = new THREE.Mesh(axisGeometry,
      new THREE.MeshBasicMaterial({color: this.visual.COLOURS[j]}));
    this.visual[j].cone = new THREE.Mesh(coneGeometry,
      new THREE.MeshBasicMaterial({color: this.visual.COLOURS[j]}));
    this.visual[j].axis.up = this.visual.THREEq[k];
    this.visual[j].cone.up = this.visual.THREEq[j];
    scene.add(this.visual[j].axis); scene.add(this.visual[j].cone);
  }

  //show/hide fucntions
  this.visual.visible = function(t){
      //this points to visual
      this.x.axis.visible = t;
      this.x.cone.visible = t;
      this.y.axis.visible = t;
      this.y.cone.visible = t;
      this.z.axis.visible = t;
      this.z.cone.visible = t;
  };
};
frames.Frame.prototype.syncVisual = function(){
  //sync THREE.Vector3 format vectors from data
  this.visual.THREEq.o.fromArray(this.o);
  this.visual.THREEq.x.fromArray(this.x);
  this.visual.THREEq.y.fromArray(this.y);
  this.visual.THREEq.z.fromArray(this.z);

  //compute correct positions
  var axisPositionOffset = (this.visual.AXIS_LENGTH+this.visual.AXIS_OFFSET)/2;
  var conePositionOffset = this.visual.AXIS_LENGTH+this.visual.AXIS_OFFSET;

  //loop over each of the axes & create THREE.js objects
  var axes = ['x', 'y', 'z', 'x']; var j; var k;
  for(var i = 0; i < 3; ++i){
    j = axes[i]; k = axes[i+1];
    //position
    this.visual[j].axis.position.fromArray(
      VEC4.add(this.o, VEC4.mul(axisPositionOffset, this[j])));
    this.visual[j].cone.position.fromArray(
      VEC4.add(this.o, VEC4.mul(conePositionOffset, this[j])));
    //point direction
    this.visual[j].axis.lookAt(this.visual.THREEq.o);
    this.visual[j].cone.lookAt(VEC4.vec4toTHREEvector3(
      VEC4.add(this.o, VEC4.add(VEC4.mul(conePositionOffset, this[j]), this[k]))
    ));
  }
};
frames.Frame.prototype.clone = function(){
  var f = new frames.Frame();
  f.o = this.o;
  f.x = this.x;
  f.y = this.y;
  f.z = this.z;
  return f;
}
