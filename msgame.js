let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)
        this.sprinkleMines(row, col);
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;

})();

let game = new MSGame();

function easy() {
	
	game.init(8, 10, 10);
  t = 0;
  if(timer) window.clearInterval(timer);
  document.getElementById("timeElapsed").innerHTML = '000';
  document.getElementById('statusGame').innerHTML = "";
	console.log(game.getRendering().join("\n"));
	console.log(game.getStatus());
  generateGrid();
}

function hard() {
	
	game.init(10, 10, 20);
  t = 0;
  if(timer) window.clearInterval(timer);
  document.getElementById("timeElapsed").innerHTML = '000';
  document.getElementById('statusGame').innerHTML = "";
	console.log(game.getRendering().join("\n"));
	console.log(game.getStatus());
  generateGrid();
}

let t = 0;
let timer = null;

function generateGrid() {
	let nbuttons = 100;
  let ncols = 10;
  let nrows = Math.ceil(nbuttons / ncols);
  let container = document.getElementById('btnContainer');
  let buttonSize = container.clientWidth / 10;
	container.innerHTML = "";

  container.style.gridTemplateColumns = `repeat(${ncols}, ${buttonSize}px)`;
  container.style.gridTemplateRows = `repeat(${nrows}, ${buttonSize}px)`;
  
  console.log(game.getRendering().join("\n"));
	console.log(game.getStatus());
  let grid = game.getRendering().join("\n");

  let butrow = 0;
  let butcol = 0;

  for(let i = 0; i<grid.length; i++) {
    if (grid[i] == "\n") {
      continue;
    }

    let button = document.createElement('button');
    button.innerHTML = grid[i];
    button.classList.add("btn");
    button.dataset.key = grid[i];
		
    button.style.fontWeight = "bolder";
    button.style.fontSize = "larger";
    button.style.backgroundColor = "lightgrey";
    //button.style.borderStyle = "solid";
    button.style.borderColor = "lightgrey";
    
    button.dataset.col = butcol;
    button.dataset.row = butrow;

    if (button.dataset.key == "H") {
    	button.innerHTML = "";
			button.style.backgroundColor = "lightgreen";
    } else if (button.dataset.key == "0") {
    	button.innerHTML = "";
    } else if (button.dataset.key == "1"){
    	button.style.color = "blue"
    } else if (button.dataset.key == "2"){
    	button.style.color = "green"
    } else if (button.dataset.key == "3"){
    	button.style.color = "orange"
    } else if (button.dataset.key == "4"){
    	button.style.color = "red"
    } else if (button.dataset.key == "F") {
    	button.style.backgroundColor = "lightgreen";
    }
    
    if (button.dataset.marked == true) {
    	button.innerHTML = "M";
      button.style.fontSize = "x-large";
    }
    container.append(button);

    butcol++;
    if (butcol > ncols-1) {
      butrow++;
      butcol = 0;
    }
  }
  
  document.getElementById('statusMines').innerHTML = game.nmines;
  document.getElementById('statusFlags').innerHTML = game.nmarked;
  
  if (game.done == true) {
  	console.log("Victory!")
    document.getElementById('statusGame').innerHTML = "Victory!";
    return;
  }
  
  if (game.exploded == true) {
  	console.log("Exploded!")
    document.getElementById('statusGame').innerHTML = "Exploded!";
    return;
  }
  
  container.addEventListener('click',leftClick);
 	container.addEventListener("contextmenu", rightClick);
}

generateGrid();

function leftClick(event) {
    if(event.target && event.target.classList.contains("btn") && event.target.dataset.key == "H"){
          console.log(event.target.dataset.key);
          console.log(event.target.dataset.col);
          console.log(event.target.dataset.row);
          game.uncover(event.target.dataset.row, event.target.dataset.col);
          generateGrid();
          timerStart();
     }
 }
 
function rightClick(event) {
		event.preventDefault();
    
    if(event.target && event.target.classList.contains("btn") && (event.target.dataset.key == "H" || event.target.dataset.key == "F")) {
          console.log(event.target.dataset.key);
          console.log(event.target.dataset.col);
          console.log(event.target.dataset.row);
          game.mark(event.target.dataset.row,event.target.dataset.col);
          //if (e.target.dataset.marked == true) {
          	//e.target.dataset.marked = false;
          //} else {
          	//e.target.dataset.marked = true;
          //}
          generateGrid();
          timerStart();
     }
 }
 
function timerStart() {
	if (!timer) {
  	timer = setInterval(function(){
   	t++;
    document.getElementById("timeElapsed").innerHTML = ('000' + t).substr(-3);
  }, 1000); 
  }
   
}

easy();

