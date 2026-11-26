let context, master, musicTimer, enabled=true, lastStep=0;
const AC=window.AudioContext||window.webkitAudioContext;
function boot(){if(!enabled||!AC)return null;if(!context){context=new AC();master=context.createGain();master.gain.value=.5;master.connect(context.destination)}if(context.state==='suspended')context.resume().catch(()=>{});return context}
function tone(frequency,duration=.16,shape='sine',volume=.18,slide=1,delay=0){const ac=boot();if(!ac)return;const now=ac.currentTime+delay,osc=ac.createOscillator(),gain=ac.createGain();osc.type=shape;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*slide),now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+duration+.02)}
function noise(duration=.08,volume=.12,filterFrequency=700){const ac=boot();if(!ac)return;const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();filter.type='lowpass';filter.frequency.value=filterFrequency;gain.gain.value=volume;source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(master);source.start()}
export function setSound(value){enabled=value;if(master)master.gain.setTargetAtTime(value?.5:0,context.currentTime,.05);if(value)boot();return enabled}
export function soundOn(){return enabled}
export function playSound(name,kind='fire'){
 if(!enabled)return;
 switch(name){
 case 'ui':tone(660,.055,'sine',.075,.8);break;
 case 'map':tone(392,.18,'triangle',.13,1.5);tone(587,.25,'sine',.09,1.3,.11);break;
 case 'step':{const now=performance.now();if(now-lastStep<155)return;lastStep=now;noise(.035,.07,340);tone(kind==='fire'?115:155,.045,'triangle',.06,.65);break}
 case 'jump':tone(kind==='fire'?240:330,.25,'triangle',.17,2.1);noise(.08,.06,900);break;
 case 'land':tone(120,.09,'triangle',.13,.55);noise(.07,.1,440);break;
 case 'gem':tone(kind==='fire'?690:810,.13,'sine',.2,1.35);tone(kind==='fire'?1035:1215,.24,'sine',.12,1.12,.09);break;
 case 'switch':tone(390,.1,'square',.11,1.4);tone(710,.2,'triangle',.16,1.05,.08);break;
 case 'gate':noise(.25,.14,350);tone(135,.42,'sawtooth',.11,1.8);break;
 case 'error':tone(230,.18,'sawtooth',.15,.65);tone(160,.25,'triangle',.11,.7,.1);break;
 case 'death':noise(.2,.19,600);tone(380,.45,'sawtooth',.16,.22);break;
 case 'door':tone(300,.18,'triangle',.12,1.3);break;
 case 'level':for(let i=0;i<5;i++)tone([392,494,587,784,988][i],.28,'sine',.15,1.02,i*.1);break;
 case 'restart':tone(520,.18,'triangle',.12,.55);break;
 case 'connect':tone(420,.13,'sine',.12,1.3);tone(690,.2,'sine',.1,1.1,.09);break;
 case 'wardrobe':tone(560,.12,'triangle',.12,1.25);break;
 case 'water':noise(.22,.08,1050);tone(300,.3,'sine',.1,.75);break;
 case 'fire':noise(.18,.1,450);tone(180,.22,'sawtooth',.09,1.25);break;
 default:tone(440,.12,'sine',.1,1.1)
 }
}
export function startAmbience(){boot();if(musicTimer)return;let i=0;musicTimer=setInterval(()=>{if(!enabled||document.hidden||!document.body.classList.contains('playing'))return;const notes=[196,247,294,220,196,165,220,247];tone(notes[i%notes.length],1.4,'sine',.035,.995);if(i%4===0)tone(98,1.8,'sine',.025,1);i++},900)}
export function stopAmbience(){if(musicTimer)clearInterval(musicTimer);musicTimer=null}
