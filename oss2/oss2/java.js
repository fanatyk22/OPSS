function toInt(x) {
	return +(x);
}

// Pomaga wyczyscic hattmla 
function clearHtml(htmlObj) {
	htmlObj.innerHTML = "";
}


(function() {
	let _ = this.Life = function(starting_board, gameRules) {
		// Sprawdzanie czy kmorka zyje czy jest martwa
		this.starting_board = boardCopy(starting_board);

		this.height = this.starting_board.length;
		this.width = this.starting_board[0].length;

		this.gameRules = gameRules;

		this.previous_boards = [];
		this.board = boardCopy(starting_board);
	};


	function boardCopy(board) {
		// zapamietuje ustawienie poczatkowe
		return board.slice().map(function(row) {return row.slice();});
	}
		//sprawdzanie sasiednich komurek
	function getNumNeighbors(board, x, y, wrapped, width, height) {
		let previousX = wrapped ? (x - 1 + width) % width : x - 1;
		let nextX = wrapped ? (x + 1) % width : x + 1;
// obsluga poprzedniego kroku wczytanie ostaniego ustawienia
		let previousY = wrapped ? (y - 1 + height) % height : y - 1;
		let nextY = wrapped ? (y + 1) % height : y + 1;
		let prevRow = board[previousY] || [];
		let currRow = board[y];
		let nextRow = board[nextY] || [];
		
		return [prevRow[previousX],	prevRow[x],	prevRow[nextX],
				currRow[previousX],	currRow[nextX],
				nextRow[previousX],	nextRow[x],	nextRow[nextX]]
				.reduce(function(prev, cur) {
					return prev + !!cur;
				}, 0);
	}

	// prosta ligistyka
	let alive = true;
	let dead = false;


	_.prototype = {
		next: function() {
			const previoud_board = boardCopy(this.board);
			let extendWidth = false;
			let extendHeight = false;

			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					let neighbors = getNumNeighbors(previoud_board, x, y, this.gameRules === "wrapped", this.width, this.height);
					let isAlive = !!this.board[y][x];
					if (isAlive && (neighbors > 3 || neighbors < 2)) {
						this.board[y][x] = dead;
					} else if (!isAlive && neighbors === 3) {
						this.board[y][x] = alive;
					}
				}
			}

			this.previous_boards.push(previoud_board);

		},

		back: function() {
			if (this.previous_boards.length > 0){
				this.board = this.previous_boards.pop();
			}
		},

		rewind: function() {
			if (this.previous_boards.length > 0){
				this.board = this.previous_boards[0];
				this.previous_boards = [];
			}
		},

		toString: function() {
			// tworzenie mapy na kolumnach i przejsciach
			return this.board.map(
				function(row) { 
					return row.map(
							function(cell) {
								return toInt(cell);
							}
						).join(' ');
				}
			).join('\n');
		},

		getBoard: function() {
			return this.board;
		},

		setBoard: function(newBoard) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					this.board[y][x] = !!newBoard && !!newBoard[y] && !!newBoard[y][x];
				}
			}
		},
        getPreviousBoard: function() {
            if (!this.isFirst()) {
                return this.previous_boards[this.getGeneration() - 2];
            }
        },
		isFirst: function() {
			return this.previous_boards.length === 0;
		},
		getWidth: function() {
			return this.width;
		},
		getHeight: function() {
			return this.height;
		},
		getGeneration: function() {
			return this.previous_boards.length + 1;
		}
	};
})();

(function(document) {
	// rozpoznanie konkretnych okienek
	let _ = this.View = function(gameGrid, backButton, nextButton, rewindButton, playButton, pauseButton, generationDisplay, speedDisplay, speedControl, clearButton, boardSizeControls, widthControl, heightControl, autoFitButton, cellSizeControl, rulesControl) {
		// logistyka menu
		this.gameGrid = gameGrid;
		// obsluga przyciskow
		this.backButton = backButton;
		this.nextButton = nextButton;
		this.rewindButton = rewindButton;
		this.playButton = playButton;
		this.pauseButton = pauseButton;
		this.generationDisplay = generationDisplay;
		this.speedDisplay = speedDisplay;
		this.speedControl = speedControl;
		this.clearButton = clearButton;
		// czytanie wartosci input
		this.boardSizeControls = boardSizeControls;
		this.widthControl = widthControl;
		this.heightControl = heightControl;
        this.autoFitButton = autoFitButton;
		this.cellSizeControl = cellSizeControl;
		this.rulesControl = rulesControl;

		this.runGame = false;

        this.autoFit();
		this.updateSize();
		this.updateCellSize();

		this.addEventListeners();
	};

    let checkboxTouchSetup = function(gameObject, checkbox) {
        checkbox.addEventListener("touchenter", function(e) {
            console.log("touchenter");
            console.log(e);
            e.preventDefault();
            e.target.checked = !e.target.checked;
            return gameObject.initGame();

        });
    };
    

	// wywolania funkcji glownych dzieki ktorym inicjowana jest gra
	//pisane na obijekcie latwiejsze odnoszenie sie do poszczegulnych funkcji
	_.prototype = {
        autoFit: function() {
            let cellSize = this.cellSizeControl.value;
            let windowInitialWidth = document.documentElement.clientWidth - 100 > cellSize * 5 ? document.documentElement.clientWidth - 100: cellSize * 5;
            let windowInitialHeight = document.documentElement.clientHeight - 190 > cellSize * 5 ? document.documentElement.clientHeight - 190 : cellSize * 5;
            this.widthControl.value = Math.round(windowInitialWidth / cellSize);
            this.heightControl.value = Math.round(windowInitialHeight / cellSize);
        },
		updateSize: function() {
            let oldBoard = [[]];
			if (this.game) {
				oldBoard = this.game.getBoard();
			}
			
			this.width = this.widthControl.value;
			this.height = this.heightControl.value;

			this.createGrid(oldBoard);
		},
		createGrid: function(board) {
			this.checkboxes = [];

			clearHtml(this.gameGrid);
			const loadingMessage = document.createDocumentFragment();
			const message = document.createElement("section");
			message.innerHTML = "Rebuilding game grid...";
			loadingMessage.appendChild(message);
			this.gameGrid.appendChild(loadingMessage);

			
			let fragment = document.createDocumentFragment();

			for (let y=0; y < this.height; y++) {
				this.checkboxes[y] = [];
				const row = document.createElement("tr");
				for (let x=0; x < this.width; x++) {
					const cell = document.createElement("td");

					const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.className = "gameCell-" + x + "-" + y;
                    checkbox.style["width"] = checkbox.style["height"] = '' + this.cellSize + 'px';

					this.checkboxes[y][x] = checkbox;

					cell.appendChild(checkbox);
					row.appendChild(cell);
				}
				fragment.appendChild(row);
			}

			clearHtml(this.gameGrid);
			this.gameGrid.appendChild(fragment);

			this.initGame();

			this.game.setBoard(board);

			this.displayBoard(board);

			this.updateSpeed();

			this.pause();
		},
		//funkcje sprawdzajace sasiadow danej komurki
		getTrueFalseGameGrid: function() {
			return this.checkboxes.map(function(row) {
				return row.map(function(checkbox) {
					return checkbox.checked;
				});
			});
		},
		initGame: function() {
			this.rules = this.rulesControl.querySelector(':checked').value;
			this.game = new Life(this.getTrueFalseGameGrid(), this.rules);
			this.backButton.disabled = true;
			this.generationDisplay.value = this.game.getGeneration();
		},
		displayBoard: function(newBoard) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					this.checkboxes[y][x].checked = !!newBoard && !!newBoard[y] && !!newBoard[y][x];
				}
			}

			this.backButton.disabled = this.game.isFirst();
			this.generationDisplay.value = this.game.getGeneration();
		},
		nextGeneration: function() {
			this.game.next();

			this.displayBoard(this.game.getBoard());
		},
		lastGeneration: function() {
			this.game.back();
			this.displayBoard(this.game.getBoard());
		},
		rewind: function() {
			this.game.rewind();
			this.displayBoard(this.game.getBoard());
		},
		updateSpeed: function() {
			this.speed = 1000 / this.speedControl.value;
			this.speedDisplay.value = '' + (1000 / this.speedControl.value) + ' m/s';
			if (this.isRunning()) {
				this.play();
			}
		},
		play: function() {
			this.pause();
			let _ = this;
			this.runGame = setInterval(function() {return _.nextGeneration();}, this.speed);
			this.playButton.style["display"] = "none";
			this.pauseButton.style["display"] = "inline-block";
		},
		pause: function() {
			if (this.runGame) {
				clearInterval(this.runGame);
			}
			this.runGame = false;

			this.pauseButton.style["display"] = "none";
			this.playButton.style["display"] = "inline-block";
		},
		clearBoard: function() {
			this.pause();
			return this.createGrid([]);
		},
		updateCellSize: function() {
			this.cellSize = this.cellSizeControl.value;
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					this.checkboxes[y][x].style["width"] = this.checkboxes[y][x].style["height"] = '' + this.cellSize + 'px';
				}
			}
		},
		isRunning: function() {
			return !!this.runGame;
		},
		addEventListeners: function() {
			let gameObject = this;

			this.gameGrid.addEventListener("mouseover", function(e) {
				if(e.buttons == 1 || e.buttons == 3) {
					e.target.checked = !e.target.checked;
					return gameObject.initGame();
			    }
			});
            this.gameGrid.addEventListener("touchstart", function(e) {
                if (e.touches.length == 1) { 
                    e.preventDefault();  
                }
			});
            this.gameGrid.addEventListener("touchmove", function(e) {
                let touch = e.touches[0];
                let checkbox = document.elementFromPoint(touch.clientX, touch.clientY);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                if (gameObject.runGame) {
                    return gameObject.initGame();
                }
			});
            this.gameGrid.addEventListener("touchend", function() {
                return gameObject.initGame();
			});
            this.gameGrid.addEventListener("touchcancel", function() {
                return gameObject.initGame();
			});
			this.gameGrid.addEventListener("click", function() {return gameObject.initGame();});
			this.backButton.addEventListener("click", function() {return gameObject.lastGeneration();});
			this.nextButton.addEventListener("click", function() {return gameObject.nextGeneration();});
			this.rewindButton.addEventListener("click", function() {return gameObject.rewind();});
			this.playButton.addEventListener("click", function() {return gameObject.play();});
			this.pauseButton.addEventListener("click", function() {return gameObject.pause();});
			this.boardSizeControls.addEventListener("change", function() {return gameObject.updateSize();});
            this.autoFitButton.addEventListener("click", function() {
                gameObject.autoFit();
                return gameObject.updateSize();
            });
			this.cellSizeControl.addEventListener("change", function() {return gameObject.updateCellSize();});
			this.rulesControl.addEventListener("change", function() {return gameObject.initGame();});
			this.speedControl.addEventListener("change", function() {return gameObject.updateSpeed();});
			this.clearButton.addEventListener("click", function() {return gameObject.clearBoard();});
		}
	};
})(document);

const gameGrid = document.getElementsByClassName("gameGrid")[0];
const backButton = document.getElementsByClassName('back')[0];
const nextButton = document.getElementsByClassName('next')[0];
const rewindButton = document.getElementsByClassName('rewind')[0];
const playButton = document.getElementsByClassName('play')[0];
const pauseButton = document.getElementsByClassName('pause')[0];
const generationDisplay = document.getElementsByClassName('generationDisplay')[0];
const speedDisplay = document.getElementsByClassName('speedDisplay')[0];
const speedControl = document.getElementsByClassName('speedControl')[0];
const clearButton = document.getElementsByClassName('clear')[0];
const boardSizeControls = document.getElementsByClassName('board-size')[0];
const widthControl = document.getElementsByClassName('widthControl')[0];
const heightControl = document.getElementsByClassName('heightControl')[0];
const autoFitButton = document.getElementsByClassName('autoFit')[0];
const cellSizeControl = document.getElementsByClassName('cellSizeControl')[0];
const rulesControl = document.getElementsByClassName('rulesControl')[0];

// wczytanie gry
let mainGame = new View(gameGrid,
						backButton,
						nextButton,
						rewindButton,
						playButton,
						pauseButton,
						generationDisplay,
						speedDisplay,
						speedControl,
						clearButton,
						boardSizeControls,
						widthControl,
						heightControl,
                        autoFitButton,
						cellSizeControl,
						rulesControl);
