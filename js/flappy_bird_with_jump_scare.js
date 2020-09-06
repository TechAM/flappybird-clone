
var view_width = view.size.width;
var view_height = view.size.height;
var SCALE_FACTOR = view_width/602; //so things adjust good on different size screens

project.currentStyle.fontSize = 20 * SCALE_FACTOR;
project.currentStyle.justification = "center";

var ground_height = 5*view_height/6;
var ground = new Path.Rectangle(new Point(-100, ground_height), new Point(view_width+100, view_height+100));
ground.fillColor = new Color({hue: 87, saturation:0.7, brightness: 0.7});
ground.strokeWidth=2;
ground.strokeColor="black";
var sky = new Raster("background");
sky.sendToBack();
sky.position = view.center;
sky.scale(1.03*view_width/sky.width);

//BALL
var ball_mass = 1;
var ball_radius = 0.04*view_height;
console.log(ball_radius);
var bird_start_position = new Point(view_width/5, view_height/3);
var ball = new Path.Circle(bird_start_position, ball_radius);
var bird_sprite = new Raster("bird_sprite");
bird_sprite.position = bird_start_position;
bird_sprite.scale(0.355*ball_radius/12.038);
var bird = new Group(ball, bird_sprite);
var bird_color = new Color({hue: 60, saturation: 0.85, brightness: 1});
var ball_velocity = new Point(0, 0);
var total_bird_rotation = 0;
var score = 0;

//FORCES and N2L
var grav_acceleration = new Point(0, 0);
var net_acceleration = new Point(0, 0);
var grav_force = new Point(0, 0);
var input_force = new Point(0, 0);
var net_force = new Point(0, 0);
var g = view_height/30;
var input_force_mag = 3*g;

//PIPES
var pipe_width = view_width/15;
var distance_between_adjacent_pipes = view_width/3;
var dist_between_top_and_bottom_pipe = view_height/4;
var min_rnd_height = (ground_height - dist_between_top_and_bottom_pipe)/5;
var max_rnd_height = ground_height - dist_between_top_and_bottom_pipe - min_rnd_height;
var first_pipe_x = 3*view_width/5;
var pipe_color = new Color({hue: 120, saturation: 0.8, brightness: 0.85});
var max_pipes_on_display = Math.ceil(view_width/distance_between_adjacent_pipes)+1;
var all_pipes = new Group();
all_pipes.insertAbove(sky);
var pipe_speed = SCALE_FACTOR;

//ONSCREEN TEXTS
var game_start_text = new PointText(view.center);
game_start_text.content = "Press spacebar to play.";
var game_over_text = new PointText(view.center);
game_over_text.visible = false;
var score_text = new PointText();
score_text.position = new Point(view_width-20, 25*SCALE_FACTOR);
var speeding_up_text = new PointText(view_width/2, view_height-20);
speeding_up_text.content="Speeding up!";
speeding_up_text.visible = false;


//SOUND EFFECTS
var sound_folder = "media/sounds/";
var score_sound_effect = new Audio();
score_sound_effect.src = sound_folder+"bruh.wav";
var game_over_sound_effect = new Audio();
game_over_sound_effect.src = sound_folder+"hey_what_happened.wav";
var flap_sound_effect = new Audio();
flap_sound_effect.src = sound_folder+"swoosh.wav";
var jump_scare_audio = new Audio();
jump_scare_audio.src = sound_folder+"scary_scream.wav";


var scary_rectangle = new Path.Rectangle(new Point(0, 0), new Point(view_width, view_height));
scary_rectangle.fillColor = "black";
var scary_face = new Raster("scary_face");
scary_face.position = view.center;
scary_face.scale(1.3);
var scary_face_group = new Group([scary_rectangle,scary_face]);
scary_face_group.sendToBack();

reset_game();
var game_over = false;
function onFrame(event){
	grav_force = grav_acceleration * ball_mass;
	net_force = grav_force + input_force;
	net_acceleration = net_force.divide(ball_mass);

	ball_velocity += net_acceleration*event.delta;
	bird.position += ball_velocity;

	score_text.content = score;

	var angle_to_rotate_by = (net_acceleration.y/3)/SCALE_FACTOR;
	if(total_bird_rotation<80 || angle_to_rotate_by<0){
		bird.rotate(angle_to_rotate_by);
		total_bird_rotation += angle_to_rotate_by;
	}

	//hit the ground or a pipe
	if(!game_over){
		if(checkCollision()){
			ball_velocity = new Point(0, 0);
			input_force = -grav_force;

			//stop pipes moving
			clearInterval(pipes_moving);
			game_over = true;
			game_over_sound_effect.play();
		}
	}else{
		game_over_text.content = "Game over!\n Your final score was " + score + "\n\nPress spacebar to restart";
		game_over_text.visible = true;
		speeding_up_text.visible = false;
		clearInterval(pipes_moving);
	}
}

function checkCollision(){
	var ground_collision = ball.position.y + ball_radius >= ground.bounds.top;
	var sky_collision = ball.position.y <= ball_radius;

	if(ground_collision || sky_collision){
		return true;
	}else{
		var pipe_collision = false;
		//loop through all the pipes and check for any intersection points between ball and pipe
		for(var i=0, n=all_pipes.children.length; i<n; i++){
			var pipe_pair = all_pipes.children[i];
			for(var j=0; j<2; j++){
				//get the rectangle that makes the pipe
				var pipe_rectangle = pipe_pair.children[j].children[0];
				var intersection_points = ball.getIntersections(pipe_rectangle);
				if(intersection_points.length>0){
					pipe_collision = true;
					break;
				}
			}
		}
		return pipe_collision;
	}
}

var pipes_moving;
function movePipes(){
	//move all the pipes
	var the_pipes = all_pipes.children;
	for(var i=0, n=the_pipes.length; i<n; i++){
		the_pipes[i].bounds.topLeft.x-=pipe_speed;
	}

	//remove leftmost pipe if it's completely offscreen
	var left_most_pipe = the_pipes[0];
	if(left_most_pipe.bounds.topRight.x<0){
		all_pipes.children[0].remove();
	}

	//create a pipe at the far right if needed
	if(all_pipes.children.length<max_pipes_on_display){
		var last_pipe_x = all_pipes.children[all_pipes.children.length-1].bounds.topLeft.x;
		var new_x = last_pipe_x + distance_between_adjacent_pipes;
		var new_pipe_pair = new PipePair(new_x).object;
		all_pipes.addChild(new_pipe_pair);
	}

	//go through all the pipes and add one to the score if the bird has gone through a pipe and the score for that pipe hasn't already been counted
	for(var i=0, n=all_pipes.children.length; i<n; i++){
		var pipe = all_pipes.children[i];
		if(pipe.counted){
			continue;
		}else{
			if(pipe.bounds.right<=bird_start_position.x){
				score+=1;

				if(score==3){
					activate_jump_scare();
					clearInterval(pipes_moving);

				}else{
					pipe.counted=true;
					score_sound_effect.play();

					//increase speed every 5 points
					if(score!=0 && score%2==0){
						pipe_speed+=0.08*SCALE_FACTOR;
						speeding_up_text.visible = true;
					}else{
						speeding_up_text.visible = false;
					}
				}
			}	
		}
	}
}

var tool = new Tool();
var space_down = false;

tool.onKeyDown = function(event){
	var key = event.key;

	//prevents flapping after game over
	if(!game_over){
		if(key=="space"){
			//start the game
			if(!pipes_moving){
				start_game();
			}
			//prevents bird from flying off screen if space bar pressed down
			if(!space_down){
				flap_sound_effect.pause();
				flap_sound_effect.currentTime = 0;
				flap_sound_effect.play();

				input_force = new Point(0, -input_force_mag);
				space_down = true;
			}else{
				input_force = new Point(0, 0);
			}
		}
	}
}
tool.onKeyUp = function(event){
	var key = event.key;
	if(!game_over){
		//make sure input_force is 0 when space isn't pressed
		if(key=="space"){
			input_force = new Point(0, 0);
			space_down = false;
		}
	}else{
		//reset the game if dead
		if(key=="space"){
			reset_game();
		}
	}
}

function start_game(){
	game_start_text.visible = false;
	pipes_moving = setInterval(movePipes, 10);
	grav_acceleration = new Point(0, g);
	score = 0;
}

function reset_game(){
	game_over = false;
	game_over_text.visible = false;
	game_start_text.visible = true;
	bird.position = bird_start_position;
	pipes_moving = null;
	grav_acceleration = new Point(0, 0);
	input_force = new Point(0, 0);
	all_pipes.removeChildren();
	createFirstCoupleOfPipes();
	bird.rotate(-total_bird_rotation);
	total_bird_rotation = 0;
}

function createFirstCoupleOfPipes(){
	//create the first pipe...
	pipe_pair = new PipePair(first_pipe_x).object;
	all_pipes.addChild(pipe_pair);
	//and then the rest
	createRemainingPipes();
}

function createRemainingPipes(){
	do{
		var last_pipe_x = all_pipes.children[all_pipes.children.length-1].bounds.topLeft.x;
		var new_x = last_pipe_x + distance_between_adjacent_pipes;
		var new_pipe_pair = new PipePair(new_x).object;
		all_pipes.addChild(new_pipe_pair);
	}while(all_pipes.children.length<max_pipes_on_display);
}

function PipePair(x_coord){
	//height of the skypipe
	var rnd_height = Math.random()*(max_rnd_height - min_rnd_height) + min_rnd_height;

	//create two rectangles the pipes
	var sky_pipe = new Path.Rectangle(new Point(x_coord, 0), new Size(pipe_width, rnd_height));
	var ground_pipe = new Path.Rectangle(new Point(x_coord, rnd_height+dist_between_top_and_bottom_pipe), new Size(pipe_width, ground_height-rnd_height-dist_between_top_and_bottom_pipe));

	//combine the rectangle and a pipe image to make a pipe
	var ground_pipe_height = ground_pipe.bounds.height;
	var pipe_graphic_ground = new Raster("pipe");
	pipe_graphic_ground.position = new Point(x_coord+pipe_width/2, rnd_height+dist_between_top_and_bottom_pipe+ground_pipe_height/2); 
	pipe_graphic_ground.scale(0.24*SCALE_FACTOR, ground_pipe_height/pipe_graphic_ground.height);
	var new_ground_pipe = new Group([ground_pipe, pipe_graphic_ground]);

	var sky_pipe_height = sky_pipe.bounds.height;
	var pipe_graphic_sky = new Raster("pipe");
	pipe_graphic_sky.position = new Point(x_coord+pipe_width/2, sky_pipe_height/2);
	pipe_graphic_sky.scale(0.24*SCALE_FACTOR, -sky_pipe_height/pipe_graphic_sky.height);
	var new_sky_pipe = new Group([sky_pipe, pipe_graphic_sky]);

	//add the two pipes into a group
	var pipe_pair = new Group();
	pipe_pair.addChild(new_sky_pipe);
	pipe_pair.addChild(new_ground_pipe);

	this.object = pipe_pair;
}

function activate_jump_scare(){
	game_over = true;

	scary_face_group.bringToFront();
	jump_scare_audio.play();
}