(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const archive = document.querySelector('#archive');
  if (archive) {
    const section = document.createElement('section');
    section.className = 'story-interlude';
    section.setAttribute('aria-labelledby', 'story-title');
    const ribbon = (text, cls) => `<div class="story-marquee ${cls}" aria-hidden="true"><div>${`<span>${text}</span>`.repeat(4)}</div></div>`;
    section.innerHTML = `${ribbon('STRANGERS <em>BECOME</em> STORIES · ', '')}<div class="story-message"><span class="story-star" aria-hidden="true">✧</span><p>Come for the night.</p><h2 id="story-title">LEAVE WITH<br><em>a story.</em></h2><a href="#events">Find your next moment <span aria-hidden="true">↗</span></a></div>${ribbon('MUSIC · MOVEMENT · MOMENTS · ', 'story-marquee-bottom')}`;
    archive.before(section);
  }
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = `precision mediump float;
    uniform vec2 resolution;uniform vec4 drops[32];uniform float time;uniform float light;
    void main(){
      vec2 p=gl_FragCoord.xy;vec2 slope=vec2(0.);float height=0.;
      for(int i=0;i<32;i++){
        float age=time-drops[i].z;
        if(age>0. && age<2.8 && drops[i].w>0.){
          vec2 d=p-drops[i].xy;float r=length(d);float radius=30.+age*75.;
          float envelope=exp(-r*r/(radius*radius))*exp(-age*1.7)*drops[i].w;
          float wave=sin(r*.052-age*5.5);
          slope+=d/max(r,1.)*cos(r*.052-age*5.5)*envelope;
          height+=wave*envelope;
        }
      }
      vec3 normal=normalize(vec3(slope*1.7,1.));
      float sheen=pow(max(dot(normal,normalize(vec3(-.6,.8,1.2))),0.),14.);
      float baseline=pow(dot(vec3(0.,0.,1.),normalize(vec3(-.6,.8,1.2))),14.);
      float edge=clamp(length(slope)*.65,0.,.8);
      vec3 color=mix(vec3(.78,.035,.065),vec3(1.,1.,1.),clamp((sheen-baseline)*2.5,0.,1.));
      color=mix(color,vec3(.38,.035,.07),light*.65);
      float alpha=clamp(edge+abs(height)*.06,0.,.62);
      gl_FragColor=vec4(color,alpha);
    }`;
  const surfaces=[];
  function surface(parent, local) {
    const canvas=document.createElement('canvas');canvas.className='liquid-surface';canvas.setAttribute('aria-hidden','true');parent.prepend(canvas);
    const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,depth:false});
    if(!gl){canvas.remove();return;}
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){canvas.remove();return;}
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms=Object.fromEntries(['resolution','drops','time','light'].map(key=>[key,gl.getUniformLocation(program,key)]));
    const drops=new Float32Array(128);let index=0,frame=0,last=0,previous=null,stamp=0;
    const disabled=()=>reduced.matches||document.hidden||document.body.classList.contains('motion-off');
    function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*.65));canvas.height=Math.max(1,Math.round(r.height*.65));gl.viewport(0,0,canvas.width,canvas.height);previous=null;}
    function render(ms){frame=0;if(disabled())return;gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform4fv(uniforms.drops,drops);gl.uniform1f(uniforms.time,ms/1000);gl.uniform1f(uniforms.light,document.documentElement.dataset.theme==='dark'?0:1);gl.drawArrays(gl.TRIANGLES,0,6);if(ms-last<2900)frame=requestAnimationFrame(render);}
    function move(e){if(disabled()||e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom){previous=null;return;}const now=performance.now();if(now-stamp<18)return;stamp=now;const x=(e.clientX-r.left)*.65,y=(r.bottom-e.clientY)*.65;const distance=previous?Math.hypot(x-previous.x,y-previous.y):0;if(distance<1&&previous)return;drops.set([x,y,now/1000,Math.min(.85,.25+distance/45)],index*4);index=(index+1)%32;previous={x,y};last=now;if(!frame)frame=requestAnimationFrame(render);}
    function stop(){cancelAnimationFrame(frame);frame=0;drops.fill(0);previous=null;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
    addEventListener('pointermove',move,{passive:true});addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);
    new MutationObserver(()=>{if(disabled())stop()}).observe(document.body,{attributes:true,attributeFilter:['class']});
    new ResizeObserver(resize).observe(canvas);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();canvas.style.display='none'});resize();surfaces.push({stop});
  }
  surface(document.body,false);
  const section=document.querySelector('.story-interlude');if(section)surface(section,true);
  addEventListener('pagehide',()=>surfaces.forEach(s=>s.stop()),{once:true});
})();
