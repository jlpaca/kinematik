//keychart.js
//constants for intuitive handling of
//user input keyboard & mouse

var KEYCHART = {};

for(var i = 96; i < 106; ++i){ KEYCHART[i] = 'NUM'+(i-96); } //NUMPAD 0-9
for(var i = 48; i < 58; ++i){ KEYCHART[i] = (i-48); } //NUMPAD 0-9
for(var i = 65; i < 91; ++i){ //KEYS A-Z
  KEYCHART[i] = String.fromCharCode(i).toUpperCase();
}

KEYCHART[9] = 'TAB';

KEYCHART[16] = 'SHIFT';
KEYCHART[17] = 'CTRL';

KEYCHART[27] = 'ESC';

KEYCHART[32] = 'SPACE';

KEYCHART[187] = '=';
KEYCHART[188] = ',';
KEYCHART[189] = '-';
KEYCHART[190] = '.';

var CLICK = {
  LEFT:   { BUTTONS: 1, BUTTON: 0 },
  MIDDLE: { BUTTONS: 4, BUTTON: 1 },
  RIGHT:  { BUTTONS: 2, BUTTON: 2 }
};
