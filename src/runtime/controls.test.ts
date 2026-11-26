import {expect,it} from 'vitest';
import {gamepadInput} from './controls';

function pad(axes:number[],buttons:number[]=[]):Pick<Gamepad,'connected'|'mapping'|'axes'|'buttons'>{
 return {connected:true,mapping:'standard',axes,buttons:Array.from({length:16},(_,i)=>({pressed:buttons.includes(i),touched:false,value:Number(buttons.includes(i))}))};
}

it('maps standard left stick, d-pad and primary action to gameplay input',()=>{
 expect(gamepadInput([pad([.65,-.8])])).toEqual({x:.65,z:.8,jump:false});
 expect(gamepadInput([pad([-.4,.7],[12,15,0])])).toEqual({x:1,z:1,jump:true});
});

it('ignores resting stick noise and disconnected or nonstandard controllers',()=>{
 expect(gamepadInput([pad([.12,-.19])])).toEqual({x:0,z:0,jump:false});
 expect(gamepadInput([{...pad([1,-1],[0]),connected:false},null])).toEqual({x:0,z:0,jump:false});
 expect(gamepadInput([{...pad([1,-1],[0]),mapping:''}])).toEqual({x:0,z:0,jump:false});
});
