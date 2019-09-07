# Kinematik

_Kinematik_ is a small web-based tool for the simulation and visualisation of articulate robots, written in 2016. It is written in javascript and should still run on modern browsers with webGL support.

This repository is hosted on github pages [here](https://osteon.github.io/kinematik).


## Controls
### Mode Manager
* TAB Key to switch to next mode (Build/FK/IK)

### Camera Navigation
* MMB(Middle Mouse Button): rotate view
* SHIFT + MMB: translate camera
* NUM 1: front view
* NUM 3: side view
* NUM 7: top view

### 3D Cursor
* LMB(Left Mouse Button): move/drag 3D cursor
* T: translate 3D cursor (move mouse to translate & click to confirm)
* T + X/Y/Z: translate 3D cursor along axis
* R: rotate 3D cursor (move mouse to rotate & click to confirm)
* R + X/Y/Z: rotate 3D cursor about axis

### Build Mode
* SPACE: add new joint at 3D cursor

### Forwards Kinematics Mode
* 1 thru 9: actuate joints +
* A thru L: actuate joints -
* SHIFT: slow down actuation speed

### Inverse Kinematics Mode
* (the end effector follows the 3D cursor.)
