import React from 'react';
import {View,Text} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useColors} from '@/lib/theme';
export function HedgeAction({summary,compact=false}:{summary:any,compact?:boolean}){
 const c=useColors();const s=summary||{tone:'muted',direction:'unknown',directionLabel:'Assessment pending',action:'Waiting for first check',reason:'Your saved position will be checked shortly.'};
 const color=({green:c.green,red:c.red,amber:c.amber,blue:c.accent,muted:c.dim} as any)[s.tone]||c.dim;
 return <View style={{backgroundColor:color+'10',borderColor:color+'55',borderWidth:1,borderRadius:20,padding:20}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name={s.direction==='bullish'?'trending-up':s.direction==='bearish'?'trending-down':'remove'} color={color} size={22}/><Text style={{color,fontSize:11,fontWeight:'800',letterSpacing:1}}>{s.directionLabel?.toUpperCase()}</Text></View><Text style={{color:c.text,fontSize:compact?22:27,fontWeight:'800',letterSpacing:-.6,marginTop:16}}>{s.action}</Text><Text style={{color:c.soft,fontSize:13,lineHeight:20,marginTop:9}}>{s.reason}</Text>{!compact&&<><View style={{flexDirection:'row',gap:8,marginTop:20}}>{s.chips?.map((x:any)=><View key={x.label} style={{flex:1,backgroundColor:c.card,padding:10,borderRadius:10}}><Text style={{color:c.dim,fontSize:10}}>{x.label}</Text><Text style={{color:c.text,fontSize:11,marginTop:5,fontWeight:'600'}}>{x.value}</Text></View>)}</View>{s.trigger&&<Text style={{color:c.soft,fontSize:12,lineHeight:18,marginTop:14}}>{s.trigger}</Text>}</>}<Text style={{color:c.dim,fontSize:10,marginTop:14}}>{s.asOf?`Daily evidence: ${s.asOf}`:'No reliable daily assessment yet'}{s.partial?' · Some inputs unavailable':''}</Text></View>;
}
