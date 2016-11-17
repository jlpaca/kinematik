
//ModeManager: manages list of modes with keypresses
var ModeManager = function(){
  this.MODELIST = [
    'B',
    'FK',
    'IK'
  ];
  this.MODEINDEX = 0;
  this.MODE = this.MODELIST[this.MODEINDEX];

  this.SWITCH_KEY = 'TAB';

  var emptyFunction = function(){};

  this.SWITCH_ACTIONS = {};
  this.CONDITIONALS = {};
  this.conditional = emptyFunction;

  this.keydownHandler = function(e){
    //e.preventDefault();

    if(KEYCHART[e.which] === this.SWITCH_KEY){ e.preventDefault();
        ++this.MODEINDEX;
        this.MODEINDEX %= this.MODELIST.length;
        this.MODE = this.MODELIST[this.MODEINDEX];

        console.log(this.MODE);

        //call switch action function if defined
        if(this.SWITCH_ACTIONS[this.MODE]){
          this.SWITCH_ACTIONS[this.MODE]();
        }
        //update mode function
        if(this.CONDITIONALS[this.MODE]){
          this.conditional = this.CONDITIONALS[this.MODE];
        } else {
          this.conditional = emptyFunction;
        }
    }
  };

  window.addEventListener('keydown', this.keydownHandler.bind(this));
};
