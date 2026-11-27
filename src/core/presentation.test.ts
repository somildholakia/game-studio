import {describe,it,expect} from 'vitest';import {defaultPresentation,readPresentation,hudLines,timerText} from './presentation';
describe('game presentation',()=>{it('validates settings and respects visibility options',()=>{expect(readPresentation(undefined)).toEqual(defaultPresentation);expect(()=>readPresentation({...defaultPresentation,distance:100})).toThrow();const s={won:false,collected:1,total:2,score:10,message:'Hello'};expect(hudLines({...defaultPresentation,hudTitle:'Test',showScore:false,showMessages:false},s)).toEqual(['Test','Collectibles 1 / 2']);expect(hudLines({...defaultPresentation,showCollectibles:false},{...s,won:true})).toContain('Level complete!');});});

it('formats a simulated timer and validates the optional persisted setting',()=>{
 expect(timerText()).toBe('Time: 0:00');expect(timerText(65.9)).toBe('Time: 1:05');expect(timerText(-4)).toBe('Time: 0:00');
 expect(readPresentation({...defaultPresentation,showTimer:true}).showTimer).toBe(true);
 expect(()=>readPresentation({...defaultPresentation,showTimer:'yes'})).toThrow();
});

it('shows loss and limited lives regardless of optional score display',()=>{
 const s={won:false,lost:true,livesRemaining:0,collected:1,total:2,score:10,message:''};
 expect(hudLines({...defaultPresentation,showScore:false},s)).toEqual(['Game over!','Lives: 0']);
});
