import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,act,tick} from '../src/game.mjs';

function ballot(n,choose){
 const game=newGame();let now=0;const players=Array.from({length:n},(_,i)=>'p'+i);
 const send=(id,type,value)=>assert.equal(act(game,{id,isHost:id==='p0',players},{type,value,step:game.step},now),undefined);
 send('p0','start');
 while(game.phase!=='vote'){now=game.deadline;tick(game,now);}
 players.forEach((id,index)=>send(id,'vote',choose(game,id,index,players)));
 return game;
}
test('one fake per three players and split leading votes identify both fakes',()=>{
 const game=ballot(6,(g,id,i)=>{
  if(g.fakes.includes(id))return g.fakes.find(other=>other!==id);
  const votes=Object.values(g.votes).filter(v=>v===g.fakes[0]).length;
  return g.fakes[votes<3?0:1];
 });
 assert.equal(game.fakes.length,2);assert.equal(game.result.townWins,true);
 assert.deepEqual(new Set(game.result.accused),new Set(game.fakes));
});
test('tie at the accusation boundary does not arbitrarily accuse a player',()=>{
 const game=ballot(3,(g,id,i,players)=>players[(i+1)%3]);
 assert.deepEqual(game.result.accused,[]);assert.equal(game.result.townWins,false);
});
