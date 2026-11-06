// Painterly canvas composition, uploaded once per frame with subtle paper grain.
export function compositor(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
 if(!gl)return null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=vec2((a.x+1.)*.5,1.-(a.y+1.)*.5);gl_Position=vec4(a,0.,1.);}'));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform vec2 size;void main(){vec4 c=texture2D(tex,uv);float grain=fract(sin(dot(floor(uv*size),vec2(12.9898,78.233)))*43758.5453);c.rgb*=.97+.03*grain;gl_FragColor=vec4(c.rgb,1.);}`));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const size=gl.getUniformLocation(program,'size');
 return {draw(source){gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(size,canvas.width,canvas.height);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.drawArrays(gl.TRIANGLES,0,6);},gl};
}
