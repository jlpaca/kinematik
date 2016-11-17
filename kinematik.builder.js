//kinematik builder: interactive construction of kinemtaic chains
//part of kinematik.js, use with THREE.js
kinematik.Builder = function(params){
  //params: { kinematicLink, cursor3D }
  this.LISTENING = false;

  params = params || {};

  this.kinematicLink = params.kinematicLink || new kinematik.KinematicLink();
  this.cursor3D = params.cursor3D; //leave undefined if not passed


  this.keydownHandler = function(e){
    //e.preventDefault();
    if(KEYCHART[e.which] === 'SPACE'){
      //new joint
      console.log('new joint');
      this.kinematicLink.extend({
        joint: {
          q: this.cursor3D.frame.o,
          axis: this.cursor3D.frame.z,
          type: kinematik.JOINT_TYPE.REVOLUTE
        }
      });
      this.kinematicLink.initVisual({ scene: WORLD.webGL.scene }, true);
      this.kinematicLink.syncVisual(true);

      //add to keyboard control map & monitor
      USER.input.kinematikActuator.mapKinematicLink();
    }
  }

  window.addEventListener('keydown', this.keydownHandler.bind(this));

};
kinematik.Builder.prototype.update = function(force){
  if(this.LISTENING || force){
    //update.
  }
};
kinematik.Builder.prototype.listen = function(t){ this.LISTENING = t; };
