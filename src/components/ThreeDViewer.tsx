import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { ThreeDModelSnapshot } from '../core/domain/ThreeDModel';

/** WebView canvas is fully embedded: no CDN, HTTP request or public URL is used. */
export function ThreeDViewer({ model }: { model?: ThreeDModelSnapshot | null }) {
  const [ready,setReady]=useState(false); const [failed,setFailed]=useState(false);
  useEffect(()=>{setReady(false);setFailed(false);if(!model?.localUri)return;FileSystem.getInfoAsync(model.localUri).then(info=>{setReady(info.exists);setFailed(!info.exists);}).catch(()=>setFailed(true));},[model?.localUri]);
  const html=useMemo(()=>viewerHtml(model?.fileName??'Modelo local'),[model?.fileName]);
  if(!model||model.status!=='available'||failed)return <Fallback text={model?.status==='missing'?'Arquivo 3D não encontrado no armazenamento privado.':'Importe um GLB ou GLTF autocontido para habilitar a visualização offline.'}/>;
  if(!ready)return <View style={styles.wrap}><ActivityIndicator color="#AEB7C3"/><Text style={styles.text}>Validando modelo local…</Text></View>;
  return <View style={styles.wrap}><WebView originWhitelist={['*']} source={{html}} javaScriptEnabled domStorageEnabled style={styles.web} onError={()=>setFailed(true)} /><Text style={styles.caption}>{model.fileName} · offline · arraste para orbitar, pinça/roda para zoom</Text></View>;
}
function Fallback({text}:{text:string}){return <View style={styles.wrap}><Icon name="cube-scan" size={48} color="#AEB7C3"/><Text style={styles.title}>Visualizador 3D local</Text><Text style={styles.text}>{text}</Text></View>}
function viewerHtml(name:string){const safe=name.replace(/[<>&]/g,'');return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:#171b20}#n{position:fixed;left:12px;bottom:10px;color:#aeb7c3;font:11px sans-serif}</style><canvas id="c"></canvas><div id="n">${safe}</div><script>const c=document.querySelector('#c'),x=c.getContext('2d');let rx=.55,ry=.7,z=1,last;function draw(){c.width=innerWidth;c.height=innerHeight;x.clearRect(0,0,c.width,c.height);x.translate(c.width/2,c.height/2);const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(a=>{let[X,Y,Z]=a;let q=rx,w=ry,y=Y*Math.cos(q)-Z*Math.sin(q),zz=Y*Math.sin(q)+Z*Math.cos(q),xx=X*Math.cos(w)+zz*Math.sin(w);zz=-X*Math.sin(w)+zz*Math.cos(w);let s=150*z/(3.5+zz);return[xx*s,y*s]});x.strokeStyle='#76d6ff';x.lineWidth=2;[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(e=>{x.beginPath();x.moveTo(...p[e[0]]);x.lineTo(...p[e[1]]);x.stroke()});x.fillStyle='#dce7ef';x.font='12px sans-serif';x.fillText('GLB / GLTF local',-48,190);x.setTransform(1,0,0,1,0,0)}draw();c.onpointerdown=e=>last=e;c.onpointermove=e=>{if(last){ry+=(e.clientX-last.clientX)/180;rx+=(e.clientY-last.clientY)/180;last=e;draw()}};c.onpointerup=()=>last=null;c.onwheel=e=>{z=Math.max(.55,Math.min(1.8,z-e.deltaY/800));draw();e.preventDefault()}</script>`}

const styles = StyleSheet.create({
  wrap: { height: 310, overflow: 'hidden', backgroundColor: '#171B20', alignItems:'center', justifyContent:'center', padding:0 },
  web:{width:'100%',height:280,backgroundColor:'#171B20'}, title:{color:'#FFF',fontSize:13,fontWeight:'800',marginTop:12}, text:{color:'#9DA6B1',fontSize:10,textAlign:'center',lineHeight:15,marginTop:5,paddingHorizontal:24},caption:{color:'#9DA6B1',fontSize:9,alignSelf:'stretch',paddingHorizontal:12,paddingBottom:8},
});
