import store from '../store';
import { attachFood, attachPlayer } from './utils';

import {  closeConsole, 
          setError } from '../reducers/controlPanel';
import {  receivePlayers,
          removeAllPlayers } from '../reducers/players';
import {  removeFood,
          receiveFood,
          receiveMultipleFood,
          removeAllFood } from '../reducers/food';
import {  lose, 
          fell, 
          ateSomeone } from '../reducers/gameStatus';
import {  incrementRecord, 
          incrementRecordPlayer, 
          clearRecord } from '../reducers/record';
import {  stopGame } from '../reducers/gameState';

import { init,
         animate,
         scene,
         world } from '../game/main';
import { Player } from '../game/player';
import {Food} from '../game/food';


export default socket => {
    // Receive current positions for all players and update game state
    // Happens before start and on server broadcast interval
    socket.on('player_data', state => {
      store.dispatch(receivePlayers(state));
    });

    // Receive current positions for all food. Happens before start.
    socket.on('food_data', state => {
      //console.log(state)
      store.dispatch(receiveMultipleFood(state));
    });

    // Set app error state on start fail
    socket.on('start_fail', err => {
      store.dispatch(setError(err));
    });

    // Run init once player/food data has been received
    socket.on('start_game', () => {
      init();
      animate();
      store.dispatch(closeConsole());
    });

    // Create player object when new player joins or on respawn
    socket.on('add_player', (id, initialData) => {
      let isMainPlayer = id === socket.id;
      let player = new Player(id, initialData, isMainPlayer);
      player.init();
    });

    // Remove player object when player leaves or dies
    socket.on('remove_player', (id, eaterId, eaterData, eatenData) => {
      let playerObject = scene.getObjectByName(id);
        if (eaterId === socket.id){
          createjs.Sound.play('eatSound');
          store.dispatch(incrementRecordPlayer());
          store.dispatch(ateSomeone(playerObject.nickname));
        }
      if (playerObject) {
        if(eaterId){
          // attach player if this was a eat event
          attachPlayer(id, eaterId, eaterData, eatenData);
        }
        world.remove(playerObject.cannon);
        scene.remove(playerObject.sprite);
        scene.remove(playerObject);
        let { children } = playerObject.children[0];
        for (let child of children) scene.remove(child);
        //playerObject.dispose(); // this isn't working yet
      }
    });

    // Create food object and add data to state on broadcast interval
    socket.on('add_food', (id, data) => {
      id = id.toString();
      let food = new Food(id, data);
      food.init();
      store.dispatch(receiveFood(id, data));
    });

    // Remove food data from state and add to player diet. Add food object to player
    socket.on('remove_food', (id, playerId, playerData) => {
        attachFood(id, playerId, playerData);
        store.dispatch(removeFood(id));
        
        if (playerId === socket.id){
          createjs.Sound.play('eatSound');
          store.dispatch(incrementRecord());
        }
      });

    socket.on('you_got_eaten', eater =>{
        store.dispatch(clearRecord());
        store.dispatch(lose(eater));
    });
    socket.on('you_lose', room =>{
        store.dispatch(clearRecord());
        store.dispatch(fell(room));
    });
};
