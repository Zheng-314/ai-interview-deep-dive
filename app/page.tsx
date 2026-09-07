'use client';
import { useEffect, useRef, useState } from 'react';
import { InterviewState, InterviewMode, InterviewTone } from '@/types/interview';
import { buildReport } from '@/lib/report';

type RecognitionLike = { lang:string; interimResults:boolean; continuous:boolean; onresult:(e:any)=>void; onerror:()=>void; onend:()=>void; start:()=>void; stop:()=>void };
type RecognitionCtor = new ()=>RecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?:RecognitionCtor; webkitSpeechRecognition?:RecognitionCtor };

const initialState = ():InterviewState => ({ jdText:'', resumeText:'', targetRole:'', interviewMode:'产品', interviewTone:'完整', currentRound:0, maxRounds:11, currentDepth:'开场', currentTopic:'', coveredTopics:[], messages:[], weaknesses:[] });

const SESSION_KEY='dig-interview-v1';
type Saved={state:InterviewState;started:boolean;done:boolean;jd:string;resume:string;mode:InterviewMode;tone:InterviewTone};
function loadSaved():Saved|null{ if(typeof window==='undefined')return null; try{ const s=sessionStorage.getItem(SESSION_KEY); return s?(JSON.parse(s) as Saved):null; }catch{ return null; } }
function clearSaved(){ if(typeof window!=='undefined') sessionStorage.removeItem(SESSION_KEY); }

function stageInfo(round:number, done:boolean):[string,string]{ if(done)return['总结与结束','面试复盘']; if(round===0)return['准备开始','自我介绍，然后讲项目']; if(round===1)return['自我介绍','开场环节']; if(round<=6)return['项目讲解',`第 ${round-1}/5 轮`]; return['岗位场景',`第 ${round-6}/5 轮`]; }

export default function Home(){
  const saved=useRef<Saved|null>(null);
  if(saved.current===null) saved.current=typeof window!=='undefined'?loadSaved():null;
  const [state,setState]=useState(saved.current?.state??initialState);
  const [jd,setJd]=useState(saved.current?.jd??''); const [resume,setResume]=useState(saved.current?.resume??'');
  const [mode,setMode]=useState<InterviewMode>(saved.current?.mode??'产品'); const [tone,setTone]=useState<InterviewTone>(saved.current?.tone??'完整');
  const [answer,setAnswer]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [started,setStarted]=useState(saved.current?.started??false); const [done,setDone]=useState(saved.current?.done??false);
  const [recording,setRecording]=useState(false); const [cameraOn,setCameraOn]=useState(false);
  const [ttsOn,setTtsOn]=useState(true); const [speaking,setSpeaking]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null); const recog=useRef<RecognitionLike|null>(null); const camStream=useRef<MediaStream|null>(null);

  useEffect(()=>()=>{ recog.current?.stop(); camStream.current?.getTracks().forEach(t=>t.stop()); if(typeof window!=='undefined'&&window.speechSynthesis)window.speechSynthesis.cancel(); },[]);
  useEffect(()=>{ if(cameraOn&&videoRef.current&&camStream.current) videoRef.current.srcObject=camStream.current; },[cameraOn]);
  useEffect(()=>{ if(!started)return; try{ sessionStorage.setItem(SESSION_KEY,JSON.stringify({state,started,done,jd,resume,mode,tone} satisfies Saved)); }catch{} },[state,started,done,jd,resume,mode,tone]);

  function readAloud(text:string){ if(typeof window==='undefined'||!window.speechSynthesis||!ttsOn||!text)return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/\s+/g,' ')); u.lang='zh-CN'; u.rate=1; u.onstart=()=>setSpeaking(true); u.onend=()=>setSpeaking(false); u.onerror=()=>setSpeaking(false); window.speechSynthesis.speak(u); }

  async function upload(file:File|null,kind:'jd'|'resume'){ if(!file)return; setError(''); const fd=new FormData(); fd.append('file',file); const r=await fetch('/api/extract',{method:'POST',body:fd}); const d=await r.json(); if(!r.ok){ setError(d.error); return; } kind==='jd'?setJd(d.text):setResume(d.text); }

  async function ask(text?:string){ setBusy(true); setError(''); try{ const s={...state,jdText:jd,resumeText:resume,interviewMode:mode,interviewTone:tone}; const r=await fetch('/api/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s,answer:text})}); const d=await r.json(); if(!r.ok)throw new Error(d.error); setState(d.state); setStarted(true); setDone(!!d.isFinished); setAnswer(''); const q=d.state?.messages?.[(d.state.messages?.length??1)-1]?.question; if(q)readAloud(q); }catch(e){ setError(e instanceof Error?e.message:'请求失败，请重试'); }finally{ setBusy(false); } }

  function start(){ if(!jd.trim()||!resume.trim()){ setError('请先上传或粘贴 JD 和简历'); return; } clearSaved(); ask(); }
  function restart(){ clearSaved(); window.speechSynthesis?.cancel(); recog.current?.stop(); setState(initialState()); setAnswer(''); setError(''); setStarted(false); setDone(false); setBusy(false); }

  function toggleMic(){ const w=window as SpeechWindow; const C=w.SpeechRecognition||w.webkitSpeechRecognition; if(!C){ setError('当前浏览器不支持实时语音识别，请使用 Chrome 或 Edge'); return; } if(recording){ recog.current?.stop(); setRecording(false); return; } const r=new C(); r.lang='zh-CN'; r.interimResults=true; r.continuous=true; r.onresult=(e:any)=>{ let t=''; for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript; setAnswer(t); }; r.onerror=()=>{ setError('语音识别暂时不可用，请改用文字输入'); setRecording(false); }; r.onend=()=>setRecording(false); recog.current=r; r.start(); setRecording(true); }

  async function toggleCamera(){ if(cameraOn){ camStream.current?.getTracks().forEach(t=>t.stop()); camStream.current=null; setCameraOn(false); return; } try{ camStream.current=await navigator.mediaDevices.getUserMedia({video:{width:640},audio:false}); setCameraOn(true); }catch{ setError('无法访问摄像头，请在浏览器地址栏允许摄像头权限后重试'); } }

  function download(){ const blob=new Blob([buildReport(state)],{type:'text/html;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='深挖面试官-复盘报告.html'; a.click(); URL.revokeObjectURL(a.href); }

  const [stageTitle,stageSub]=stageInfo(state.currentRound,done);
  const current=state.messages[state.messages.length-1];
  const avatarStatus:'thinking'|'speaking'|'idle' = busy?'thinking':speaking?'speaking':'idle';

  return <main className={started?'in-stage':'in-setup'}>
    {!started
      ? <Setup jd={jd} setJd={setJd} resume={resume} setResume={setResume} upload={upload} mode={mode} setMode={setMode} tone={tone} setTone={setTone} start={start} busy={busy}/>
      : <Stage state={state} done={done} current={current} stageTitle={stageTitle} stageSub={stageSub} answer={answer} setAnswer={setAnswer} busy={busy} ask={ask} recording={recording} toggleMic={toggleMic} cameraOn={cameraOn} toggleCamera={toggleCamera} videoRef={videoRef} download={download} ttsOn={ttsOn} setTtsOn={setTtsOn} avatarStatus={avatarStatus} readAloud={readAloud} restart={restart}/>
    }
    {error&&<div className="error" role="alert">{error}</div>}
    <footer className="foot">{started?'摄像头画面仅保存在你的浏览器，不上传、不录像':'你的文件不会被持久保存，仅用于本次模拟'}</footer>
  </main>;
}

/* ---------- 准备页（暖纸 · 三步序列） ---------- */
function Setup(p:{jd:string;setJd:(v:string)=>void;resume:string;setResume:(v:string)=>void;upload:(f:File|null,k:'jd'|'resume')=>void;mode:InterviewMode;setMode:(m:InterviewMode)=>void;tone:InterviewTone;setTone:(t:InterviewTone)=>void;start:()=>void;busy:boolean}){
  return <>
    <header className="setup-head">
      <div className="brand">深挖面试官</div>
      <h1>像真实面试一样练习，<br/>而不是刷题。</h1>
      <p>上传 JD 和简历，AI 面试官带你走完自我介绍、项目讲解、岗位追问的完整流程，结束给你一份真诚的复盘报告。</p>
    </header>
    <section className="steps">
      <div className="step">
        <div className="step-no">一</div>
        <div className="step-body">
          <h2>准备两份材料</h2>
          <div className="upload-row">
            <Dropzone label="目标岗位 JD" value={p.jd} setValue={p.setJd} onFile={f=>p.upload(f,'jd')} hint="PDF，或直接粘贴文字；截图请粘贴文字"/>
            <Dropzone label="你的简历" value={p.resume} setValue={p.setResume} onFile={f=>p.upload(f,'resume')} hint="PDF，或直接粘贴文字"/>
          </div>
        </div>
      </div>
      <div className="step">
        <div className="step-no">二</div>
        <div className="step-body">
          <h2>选方向与氛围</h2>
          <Segmented label="岗位方向" options={[{v:'产品',t:'产品面',d:'洞察 · 需求 · 迭代'},{v:'技术',t:'技术面',d:'架构 · 选型 · 性能'}]} value={p.mode} onChange={v=>p.setMode(v as InterviewMode)}/>
          <Segmented label="面试氛围" options={[{v:'完整',t:'完整面试',d:'正式节奏，逐层深入'},{v:'轻松',t:'轻松面试',d:'温和引导，先认可再追问'}]} value={p.tone} onChange={v=>p.setTone(v as InterviewTone)}/>
        </div>
      </div>
      <div className="step">
        <div className="step-no">三</div>
        <div className="step-body">
          <h2>进入面试间</h2>
          <p className="step-note">共 11 轮：自我介绍 1 轮、项目讲解 5 轮、岗位场景 5 轮，最后是总结与建议。随时可以用语音回答。</p>
          <button className="cta" onClick={p.start} disabled={p.busy}>{p.busy?'正在呼叫面试官…':'开始模拟面试'}</button>
        </div>
      </div>
    </section>
  </>;
}

function Segmented({label,options,value,onChange}:{label:string;options:{v:string;t:string;d:string}[];value:string;onChange:(v:string)=>void}){
  return <div className="seg-group">
    <span className="seg-label">{label}</span>
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(o=><button key={o.v} role="radio" aria-checked={value===o.v} className={value===o.v?'seg-btn on':'seg-btn'} onClick={()=>onChange(o.v)}><b>{o.t}</b><small>{o.d}</small></button>)}
    </div>
  </div>;
}

function Dropzone({label,value,setValue,onFile,hint}:{label:string;value:string;setValue:(v:string)=>void;onFile:(f:File|null)=>void;hint:string}){
  const [drag,setDrag]=useState(false);
  return <div className={`dz ${drag?'over':''}`} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);onFile(e.dataTransfer.files[0]||null);}}>
    <div className="dz-top"><b>{label}</b><span className="dz-hint">{value?`已读取 ${value.length} 字`:'拖 PDF 进来，或点选择文件'}</span></div>
    <input type="file" accept="application/pdf" aria-label={label} onChange={e=>onFile(e.target.files?.[0]||null)}/>
    <textarea value={value} onChange={e=>setValue(e.target.value)} placeholder={hint} aria-label={`${label}文本`}/>
  </div>;
}

/* ---------- 面试间（深色舞台 · 数字人 + 摄像头） ---------- */
function Stage(p:{state:InterviewState;done:boolean;current?:{round:number;question:string;answer?:string;depth:string};stageTitle:string;stageSub:string;answer:string;setAnswer:(v:string)=>void;busy:boolean;ask:(t:string)=>void;recording:boolean;toggleMic:()=>void;cameraOn:boolean;toggleCamera:()=>void;videoRef:React.RefObject<HTMLVideoElement | null>;download:()=>void;ttsOn:boolean;setTtsOn:(v:boolean)=>void;avatarStatus:'idle'|'thinking'|'speaking';readAloud:(t:string)=>void;restart:()=>void}){
  return <section className="stage">
    <div className="stage-top">
      <span className="brand light">深挖面试官</span>
      <span className="stage-phase">{p.stageTitle}<em>{p.stageSub}</em></span>
      <span className="round-counter">{p.done?'完成':`${Math.min(p.state.currentRound,11)} / 11`}</span>
    </div>
    <div className="stage-main">
      <div className="stage-left">
        <Interviewer status={p.avatarStatus}/>
        {p.done
          ? <div className="closing">
              <h2 className="q serif">面试结束</h2>
              <p>{p.state.closingMessage||'本次模拟到这里结束。请优先补强最薄弱的两个方向，再进行下一轮练习。'}</p>
              <div className="closing-actions">
                <button className="cta" onClick={p.download}>下载复盘报告</button>
                <button className="tool" onClick={p.restart}>再练一次</button>
              </div>
            </div>
          : <>
              <div className="q-meta">
                <span>{p.current?.depth==='开场'?'开场环节':`${p.current?.depth??''}度追问`}</span>
                <button className={`tool ${p.ttsOn?'on':''}`} onClick={()=>p.setTtsOn(!p.ttsOn)} aria-pressed={p.ttsOn}>{p.ttsOn?'朗读开着':'朗读关着'}</button>
                {p.ttsOn&&p.current&&<button className="tool" onClick={()=>p.readAloud(p.current!.question)}>重听问题</button>}
              </div>
              <h2 className="q serif" key={p.current?.round}>{p.current?.question}</h2>
              <div className="dock">
                <textarea value={p.answer} onChange={e=>p.setAnswer(e.target.value)}
                  onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&p.answer.trim())p.ask(p.answer); }}
                  placeholder={p.state.currentRound===1?'请做 60–90 秒自我介绍：背景、相关经历、和这个岗位的匹配点…':p.state.currentRound<=6?'讲清项目的背景、方案、你的贡献、结果和取舍…':'结合岗位场景回答：你的判断、依据和行动…'}
                  disabled={p.busy} aria-label="你的回答"/>
                <div className="dock-tools">
                  <span className={p.recording?'rec live':'rec'}>{p.answer.length} 字{p.recording?' · 录音中':''}</span>
                  <div className="dock-btns">
                    <button className={`tool dark ${p.recording?'warn':''}`} onClick={p.toggleMic} aria-pressed={p.recording}>{p.recording?'停止语音':'语音回答'}</button>
                    <button className="cta small" onClick={()=>p.answer.trim()&&p.ask(p.answer)} disabled={p.busy||!p.answer.trim()}>{p.busy?'面试官思考中…':'提交回答'}</button>
                  </div>
                </div>
              </div>
            </>}
      </div>
      <div className="stage-right">
        <div className="cam-frame">
          {p.cameraOn
            ? <video ref={p.videoRef} autoPlay muted playsInline className="cam-video" aria-label="你的摄像头画面"/>
            : <button className="cam-off" onClick={p.toggleCamera}>开启我的摄像头<small>画面只留在本机</small></button>}
          {p.cameraOn&&<><span className="cam-tag">你</span><button className="cam-close" onClick={p.toggleCamera} aria-label="关闭摄像头">×</button></>}
        </div>
        <dl className="meta-list">
          <div><dt>岗位方向</dt><dd>{p.state.interviewMode}面</dd></div>
          <div><dt>面试氛围</dt><dd>{p.state.interviewTone}</dd></div>
          <div><dt>当前主题</dt><dd>{p.state.currentTopic||'自我介绍'}</dd></div>
          <div><dt>待改进点</dt><dd>{p.state.weaknesses.length} 个</dd></div>
        </dl>
      </div>
    </div>
    <details className="transcript">
      <summary>完整对话记录<span>{p.state.messages.length} 问</span></summary>
      {p.state.messages.map((m,i)=><div className="tr" key={i}><small>第 {m.round} 轮 · {m.depth}</small><p>{m.question}</p>{m.answer&&<em>{m.answer}</em>}</div>)}
    </details>
  </section>;
}

/* ---------- AI 面试官数字人 ---------- */
function Interviewer({status}:{status:'idle'|'thinking'|'speaking'}){
  const text = status==='thinking'?'正在分析你的回答':status==='speaking'?'正在朗读问题':'在听你说';
  return <div className={`interviewer ${status}`} aria-label={`AI 面试官：${text}`}>
    <div className="halo"/>
    <svg viewBox="0 0 220 220" role="img" aria-hidden="true">
      <g className="bust">
        <path d="M38 221 C38 179 74 161 110 161 C146 161 182 179 182 221 Z" fill="#22304A"/>
        <path d="M92 161 L110 186 L128 161 L121 156 L110 168 L99 156 Z" fill="#F2ECE0"/>
        <rect x="98" y="132" width="24" height="28" rx="10" fill="#DCA97F"/>
        <circle cx="77" cy="107" r="6" fill="#DCA97F"/><circle cx="143" cy="107" r="6" fill="#DCA97F"/>
        <ellipse cx="110" cy="104" rx="34" ry="38" fill="#E7BC96"/>
        <path d="M76 101 C73 66 147 62 144 99 C137 79 124 73 110 73 C96 73 83 79 76 101 Z" fill="#262B38"/>
        <path d="M71 93 C71 57 149 57 149 93" fill="none" stroke="#0F1724" strokeWidth="6" strokeLinecap="round"/>
        <circle cx="71" cy="106" r="8" fill="#0F1724"/>
        <path d="M77 112 C85 133 96 139 105 139" fill="none" stroke="#E8A33D" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="107" cy="139" r="4" fill="#E8A33D"/>
        <g stroke="#0F1724" strokeWidth="3" fill="rgba(244,239,228,.3)">
          <circle cx="94" cy="103" r="12"/><circle cx="126" cy="103" r="12"/><path d="M106 103 L114 103" fill="none"/>
        </g>
        <g className="eyes" fill="#0F1724"><circle cx="94" cy="103" r="2.6"/><circle cx="126" cy="103" r="2.6"/></g>
        <path d="M86 89 L102 87" stroke="#262B38" strokeWidth="3" strokeLinecap="round"/>
        <path d="M118 87 L134 89" stroke="#262B38" strokeWidth="3" strokeLinecap="round"/>
        <path d="M110 109 L110 119" stroke="#C99771" strokeWidth="3" strokeLinecap="round"/>
        <ellipse className="mouth" cx="110" cy="126" rx="8" ry="2.6" fill="#8C5A4A"/>
      </g>
    </svg>
    <div className="i-status"><span className="i-dot"/>{text}</div>
  </div>;
}
