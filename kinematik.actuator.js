
//kinematik actuator: control interface for kinematik links
//part of kinematik.js, use with THREE.js

kinematik.Actuator = function(params){
  //params: { kinematicLink }
  this.LISTENING = false;

  this.kinematicLink = params.kinematicLink;

  this.mapKinematicLink();

  //parameters
  this.ACTUATION_INCREMENT = { TH: 6e-2, D: 2e-2 }  //increment step
  this.SHIFT_SCALE = 1e-1;          //scale factor when SHIFT

  //list of joints pending actuation
  this.ACTUATE = [];

  var REVERSE = {'A':1, 'S':2, 'D':3, 'F':4,
                'G':5, 'H':6, 'J':7, 'K':8, 'L':9};
  this.keydownHandler = function(e){ if(this.LISTENING){
    //e.preventDefault();

    var k = KEYCHART[e.which];
    //actuate +
    if(0 < k && k <= 9){
      if(k >= this.L.length){
        //check if link has changed,
        //register new links if necessary.
        this.mapKinematicLink();
      }
      if(k < this.L.length){
        //raise actuation flag on corresponding joint
        this.ACTUATE[k] = (e.shiftKey?this.SHIFT_SCALE:1);
      }
    }
    //actuate -
    k = REVERSE[k];
    if(0 < k && k <= 9 && k < this.L.length){
      this.ACTUATE[k] = -(e.shiftKey?this.SHIFT_SCALE:1);
    }

  }};
  this.keyupHandler = function(e){ if(this.LISTENING){
    //
    var k = KEYCHART[e.which];
    if(0 < k && k <= 9 && this.ACTUATE[k] > 0){
      this.ACTUATE[k] = false;
    }
    k = REVERSE[k];
    if(0 < k && k <= 9 && this.ACTUATE[k] < 0){
      this.ACTUATE[k] = false;
    }
  }};

  window.addEventListener('keydown', this.keydownHandler.bind(this));
  window.addEventListener('keyup', this.keyupHandler.bind(this));
};
kinematik.Actuator.prototype.mapKinematicLink = function(){
  this.L = [];
  for(var r = this.kinematicLink;
      r.child instanceof kinematik.KinematicLink;
      r = r.child){
      this.L[this.L.length] = r;
  }
};
kinematik.Actuator.prototype.update = function(){ if(this.LISTENING){
  //actuate joints
  var inc = 0;
  for(var i = 1; i < this.L.length; ++i){
    if(this.ACTUATE[i]){
      if(this.L[i].jointType === kinematik.JOINT_TYPE.REVOLUTE){
        inc = this.ACTUATION_INCREMENT.TH;
      } else if (this.L[i].jointType === kinematik.JOINT_TYPE.PRISMATIC){
        inc = this.ACTUATION_INCREMENT.D;
      }
      this.L[i].increment(this.ACTUATE[i]*inc);
    }
  }
}};
kinematik.Actuator.prototype.listen = function(t){ this.LISTENING = t; }
