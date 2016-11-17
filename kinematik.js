//kinematik: the kinematics

//keep the inertial frame handy.
kinematik.INERTIAL_FRAME = new frames.Frame();
kinematik.DenavitHartenberg = function(d, th, r, alf){
  //structure for D-H parameters
  this.d = d || 0; this.th  = th  || 0;
  this.r = r || 0; this.alf = alf || 0;
  return this;
};
kinematik.DenavitHartenberg.prototype.mat4 = function(){
  //return 4-matrix transformation
  var M = [
    [Math.cos(this.th),
    -Math.sin(this.th)*Math.cos(this.alf),
     Math.sin(this.th)*Math.sin(this.alf),
     this.r*Math.cos(this.th)],
    [Math.sin(this.th),
     Math.cos(this.th)*Math.cos(this.alf),
    -Math.cos(this.th)*Math.sin(this.alf),
     this.r*Math.sin(this.th)],
    [0, Math.sin(this.alf), Math.cos(this.alf), this.d],
    [0, 0, 0, 1]
  ];
  return M;
};

//the kinematicLink class is both link and chain
//the kinematic chain is structured as a tree.
kinematik.JOINT_TYPE = {};
kinematik.JOINT_TYPE.REVOLUTE = 0;
kinematik.JOINT_TYPE.PRISMATIC = 1;
kinematik.KinematicLink = function (params){
  //create empty kinematic link object.

  //params { parent, DH }

  //heirarchy data
  this.parent = null || params.parent;
  this.child = null;
  if(this.parent instanceof kinematik.KinematicLink){
    this.parent.child = this;
  }

  //joint type. Only revolute joints supported for now.
  this.jointType = params.type;
  this.jointRange = null;
  //kinematic data
  this.frame = new frames.Frame();
  this.DH = new kinematik.DenavitHartenberg();

  this.M = numeric.identity(4);
  this.T = numeric.identity(4);

  this.jointOffset = params.jointOffset || [0, 0, 0, 1];
};
kinematik.KinematicLink.prototype.updateDataFromDH = function(propagate){
  //calculate M and T matrices from DH parameters
  // & apply appropriate transformation to frame.
  this.M = this.DH.mat4();
  this.T = this.M;
  if(this.parent instanceof kinematik.KinematicLink){
    this.T = numeric.dot(this.parent.T, this.M);
  }
  this.frame.setTransform(this.T);

  if(propagate && this.child instanceof kinematik.KinematicLink){
    this.child.updateDataFromDH(true);
  }
};
//actuate and increment: actuate joints by editing joint parameters
kinematik.KinematicLink.prototype.actuate = function(v){
  if(this.jointType === kinematik.JOINT_TYPE.REVOLUTE){
    //revolute joint, active joint parameter is DH.th

    //clamp against joint limits;
    v = Math.min(Math.max(
        v, this.jointRange[0]), this.jointRange[1]);
    this.DH.th = v;
    this.updateDataFromDH(true);
  } else if (this.jointType === kinematik.JOINT_TYPE.PRISMATIC){
    this.DH.d = v;
    this.updateDataFromDH(true);
  }
};
kinematik.KinematicLink.prototype.increment = function(dv){
  if(this.jointType === kinematik.JOINT_TYPE.REVOLUTE){
    this.actuate(this.DH.th + dv);
  } else if (this.jointType === kinematik.JOINT_TYPE.PRISMATIC){
    this.actuate(this.DH.d + dv);
  }
};

kinematik.KinematicLink.prototype.extend = function(params){
  //append new link to tip of present chain.
  //traverse down tree if not already at tip.
  if(this.child instanceof kinematik.KinematicLink){
    this.child.extend(params); return;
  }



  //if parameters given in terms of joint location and axis:
  if(params.joint){
    //assign from joint data

    //append child to kinematic link
    this.child = new kinematik.KinematicLink({ parent: this, type: params.joint.type });

    var newz = VEC4.unit(params.joint.axis);
    var newo = params.joint.q;

    var oldFrame = kinematik.INERTIAL_FRAME;
    if(this.parent instanceof kinematik.KinematicLink){
      oldFrame = this.parent.frame;
    }
    var v = VEC4.sub(newo, oldFrame.o);

    var newDH = new kinematik.DenavitHartenberg();

    //when assigning joint i, compute
    //D-H for frame i-1.

    //check if new z is parallel to old z.
    if(VEC4.zero(VEC4.x(newz, oldFrame.z))){

      //old and new z-axes are parallel.
      newDH.alf = 0;  //z-axis not rotated, alf is 0.
      newDH.d = 0;    //d is free parameter, 0 by convention.

      //common normal vector
      var n = VEC4.sub(v,
              VEC4.mul(VEC4.dot(v, oldFrame.z), oldFrame.z));

      if(VEC4.zero(n)){
        newDH.r = 0;  //new and old origins colinear along z
        newDH.th = 0; //new x arbitrary, is old x by convention.
      } else {
        newDH.r = VEC4.mag(n);
        var newx = VEC4.unit(n);
        newDH.th = VEC4.ang(n, oldFrame.x, oldFrame.z);
      }

    } else {
      //old and new axes are not parallel

      //obtain endpoints of common normal vector by solving
      //a linear system of equations
      var deltao = VEC4.sub(newo, oldFrame.o)

      //where ntip = newo + k newz
      //      ntoe = oldo + t oldz
      var kt = numeric.solve([
        [VEC4.dot(newz, newz), -VEC4.dot(oldFrame.z, newz)],
        [VEC4.dot(newz, oldFrame.z), -VEC4.dot(oldFrame.z, oldFrame.z)],
      ],[
        -VEC4.dot(deltao, newz),
        -VEC4.dot(deltao, oldFrame.z),
      ]);

      //endpoints of normal vector.
      var ntip = VEC4.add(newo, VEC4.mul(kt[0], newz));
      var ntoe = VEC4.add(oldFrame.o, VEC4.mul(kt[1], oldFrame.z));

      var n = VEC4.sub(ntip, ntoe);

      newDH.d = kt[1]; //offset along old axis to common normal
      var newx;

      //check if n is zero
      if(VEC4.zero(n)){
        //two lines coplanar
        newDH.r = 0;
        newx = VEC4.unit(VEC4.x(oldFrame.z, newz));  //new x the common normal
      } else {
        //old and new axes not coplanar
        newDH.r = VEC4.mag(n);
        newx = VEC4.unit(n);
      }
      newDH.th = VEC4.ang(newx, oldFrame.x, oldFrame.z);
      newDH.alf = VEC4.ang(newz, oldFrame.z, n);

    }

    this.DH = newDH;
    this.updateDataFromDH();
    var jointv = VEC4.sub(params.joint.q, this.frame.o);
    this.jointOffset = [
      VEC4.dot(jointv, this.frame.x),
      VEC4.dot(jointv, this.frame.y),
      VEC4.dot(jointv, this.frame.z),
      1
    ];

    //joint is without range limit unless
    //otherwise specified
    this.jointRange = [-Infinity, Infinity];
    if(params.joint.range){
    this.jointRange = [this.DH.th+params.joint.range[0],
                       this.DH.th+params.joint.range[1]];
    }

  } else {
    //OTHER METHODS OF SPECIFYING LINKAGES NOT SUPPORTED YET.
  }
};
kinematik.KinematicLink.prototype.initVisual = function(params, propagate){
  //add to THREE.js scene relevant meshes for visualisation

  //IMPORTANT: only call this function for links w/ children.
  //links with no children yet without their D-H parameters
  //calculated will not render correctly.
  if(!(this.child instanceof kinematik.KinematicLink)){ return; }
  if(this.visual){
    //initVisual already called, prevent repeated calls.
  } else {

    //params {scene, renderer}
    var scene = params.scene;
    var renderer = params.renderer;
    var materialColour = params.materialColour || 0xffffff;

    //initialise visuals of auxiliary objects as well
    this.frame.initVisual(params);

    //initialise visuals: corresponding elements
    //in the webGL environment
    this.visual = {};
    //parameters that define the appearance of objects
    this.visual.SHAFT_THICKNESS = 0.02;
    this.visual.JOINT_THICKNESS = { TIP: 0.04, TOE: 0.06 };
    this.visual.JOINT_HEIGHT = { TIP: 0.06, TOE: 0.04 };
    this.visual.MATERIAL = new THREE.MeshPhongMaterial({color: materialColour });

    //connect to parent frame if parent frame exists,
    //otherwise connect to origin (case for link 0)
    var tip = VEC4.fromVec4inFrame(this.jointOffset, this.frame);
    var toe = [0, 0, 0, 1];
    if(this.parent instanceof kinematik.KinematicLink){
      toe = VEC4.fromVec4inFrame(this.parent.jointOffset, this.parent.frame);
    }
    var shaftLength = VEC4.mag(VEC4.sub(tip,toe));

    //add shaft of appropriate length and cylinder(joint) to scene.
    //not positioning and orienting them yet: to do that, call syncVisual()
    this.visual.shaft = new THREE.Mesh(
      new THREE.CubeGeometry(this.visual.SHAFT_THICKNESS,
                             this.visual.SHAFT_THICKNESS, shaftLength),
      this.visual.MATERIAL); scene.add(this.visual.shaft);

    this.visual.tipJoint = new THREE.Mesh(
      new THREE.CylinderGeometry(this.visual.JOINT_THICKNESS.TIP/2,
                                 this.visual.JOINT_THICKNESS.TIP/2,
                                 this.visual.JOINT_HEIGHT.TIP, 16),
      this.visual.MATERIAL); scene.add(this.visual.tipJoint);

    if(this.parent instanceof kinematik.KinematicLink){
      //the joint connecting link i and link i-1:
      //check for existence of link i-1 first
      this.visual.toeJoint = new THREE.Mesh(
        new THREE.CylinderGeometry(this.visual.JOINT_THICKNESS.TOE/2,
                                   this.visual.JOINT_THICKNESS.TOE/2,
                                   this.visual.JOINT_HEIGHT.TOE, 16),
        this.visual.MATERIAL); scene.add(this.visual.toeJoint);
    }
  }

  if(propagate && this.child instanceof kinematik.KinematicLink){
    this.child.initVisual(params, propagate);
  }
};
kinematik.KinematicLink.prototype.syncVisual = function(propagate){
  //update visual representation according to link data.

  //only links with children will have properly assigned parameters.
  if(!(this.child instanceof kinematik.KinematicLink)){ return; }

  //sync visuals of auxiliary objects as well
  this.frame.syncVisual();

  //Position & orient shaft
  var tip = VEC4.fromVec4inFrame(this.jointOffset, this.frame);
  var toe = [0, 0, 0, 1];
  if(this.parent instanceof kinematik.KinematicLink){
    toe = VEC4.fromVec4inFrame(this.parent.jointOffset, this.parent.frame);
  }
  var shaftVector = VEC4.sub(tip,toe);
  var shaftCentre = VEC4.mul(0.5, VEC4.add(tip, toe));

  this.visual.shaft.position.fromArray(shaftCentre);
  var shaftUp = Math.abs(VEC4.dot(shaftVector, this.frame.z))
              > Math.abs(VEC4.dot(shaftVector, this.frame.x)) ?
              this.frame.x : this.frame.z;

  this.visual.shaft.up = VEC4.vec4toTHREEvector3(shaftUp);
  this.visual.shaft.lookAt(VEC4.vec4toTHREEvector3(toe));

  //Position & orient joint between i and i+i
  this.visual.tipJoint.position.fromArray(tip);
  this.visual.tipJoint.up = VEC4.vec4toTHREEvector3(this.frame.z);
  this.visual.tipJoint.lookAt(VEC4.vec4toTHREEvector3(VEC4.add(tip, this.frame.x)));

  if(this.parent instanceof kinematik.KinematicLink){
    //Position & orient joint between i and i-1 if such a joint exists
    this.visual.toeJoint.position.fromArray(toe);
    this.visual.toeJoint.up = VEC4.vec4toTHREEvector3(this.parent.frame.z);
    this.visual.toeJoint.lookAt(VEC4.vec4toTHREEvector3(VEC4.add(toe, this.parent.frame.x)));
  }


  if(propagate && (this.child instanceof kinematik.KinematicLink)){
    this.child.syncVisual(true);
  }
};

//kinematic manipulator: contains link and ik functionality
kinematik.dampedLeastSquares = function(params){
  //params: { kinematicLink, target, lambda, iter, threshold }

  var DEFAULT = {};
  DEFAULT.TARGET = kinematik.INERTIAL_FRAME;
  DEFAULT.LAMBDA = 1e-2;
  DEFAULT.ITER = 512;
  DEFAULT.THRESHOLD = 1e-4;

  DEFAULT.DTH_CLAMP = Infinity;

  //build link list
  var L = [];
  for(var r = params.kinematicLink;
      r.child instanceof kinematik.KinematicLink;
      r = r.child){ L[L.length] = r; }
  var targi = L.length-1;

  //calc target. Since there is a tool offset
  //and setTransform is mutable, do a copy.
  var target = (params.target || DEFAULT.TARGET).clone();
  var toolR = VEC4.framesToMat4(target, kinematik.INERTIAL_FRAME);

  //parameters for DLS
  var iter = params.iter || DEFAULT.ITER;
  var lambda = params.lambda || DEFAULT.LAMBDA;
  var threshold = params.threshold || DEFAULT.THRESHOLD;
  var dthClamp = Math.abs(params.dthClamp) || DEFAULT.DTH_CLAMP;
  //calculate tool offset
  var toolOffset = VEC4.sum([
  VEC4.mul(L[targi].jointOffset[0], target.x),
  VEC4.mul(L[targi].jointOffset[1], target.y),
  VEC4.mul(L[targi].jointOffset[2], target.z)]);
  target.o = VEC4.sub(target.o, toolOffset);

  var error = 0;
  //calculate jacobian
  var J = [[], [], [], [], [], []]; var j;

  for(var it = 0; it < iter; ++it){

    //evaluate e: desired effect on end effector frame
    var e = [];
    e[0] = target.o[0]-L[targi].frame.o[0];
    e[1] = target.o[1]-L[targi].frame.o[1];
    e[2] = target.o[2]-L[targi].frame.o[2];

    //calculate target transformation
    //for use in inverse orientation dynamics

    var nd = [toolR[0][0], toolR[1][0], toolR[2][0], 1];
		var sd = [toolR[0][1], toolR[1][1], toolR[2][1], 1];
		var ad = [toolR[0][2], toolR[1][2], toolR[2][2], 1];

		var Re = L[targi].T;

		var ne = [Re[0][0], Re[1][0], Re[2][0], 1];
		var se = [Re[0][1], Re[1][1], Re[2][1], 1];
		var ae = [Re[0][2], Re[1][2], Re[2][2], 1];

		var eo = VEC4.mul(0.5,
			VEC4.add(VEC4.add(
			VEC4.x(ne, nd), VEC4.x(se, sd)
    ), VEC4.x(ae, ad)));


		e[3] = eo[0];
		e[4] = eo[1];
		e[5] = eo[2];

    //if error is already small, return.
    error = numeric.norm2Squared(e);
    if(error < threshold){ return iter; }

    //if error is still large, continue with a DLS iteration
    for(var i = 0; i < targi; ++i){ j = i+1;
      var zxd = VEC4.x(L[i].frame.z,
                VEC4.sub(L[targi].frame.o, L[i].frame.o));
      J[0][i] = zxd[0];
      J[1][i] = zxd[1];
      J[2][i] = zxd[2];
      J[3][i] = L[i].frame.z[0];
      J[4][i] = L[i].frame.z[1];
      J[5][i] = L[i].frame.z[2];
    }
    var Jt = numeric.transpose(J);


    var dth = numeric.dot(Jt,
    numeric.inv(
      numeric.add(
        numeric.dot(J, Jt),
        numeric.mul(lambda*lambda, numeric.identity(6))
      )
    ));
    dth = numeric.dotMV(dth, e);

    //implement increment
    for(var i = 0; i < targi; ++i){ j = i+1;
      dth[i] = Math.min(Math.max(-dthClamp, dth[i]), dthClamp);
      L[j].increment(dth[i]);
    }
  }

  //if this exectues, failed to converge.
  return false;
};
