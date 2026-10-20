import React from 'react';
import {View,Text} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useColors} from '@/lib/theme';
export function HedgeAction({summary,compact=false}:{summary:any,compact?:boolean}){
 const c=useColors();const s=summary||{tone:'muted',direction:'unknown',directionLabel:'Assessment pending',action:'Waiting for first check',reason:'Your saved position will be checked shortly.'};
 const color=({green:c.green,red:c.red,amber:c.amber,blue:c.accent,muted:c.dim} as any)[s.tone]||c.dim;
 return <View style={{backgroundColor:color+'10',borderColor:color+'55',borderWidth:1,borderRadius:20,padding:22}}><Text style={{color,fontSize:10,fontWeight:'800',letterSpacing:1.2}}>YOUR NEXT STEP</Text><Text style={{color:c.text,fontSize:compact?24:29,fontWeight:'800',letterSpacing:-.6,marginTop:12}}>{s.action}</Text><Text style={{color:c.soft,fontSize:13,lineHeight:21,marginTop:10}}>{s.reason}</Text><View style={{flexDirection:'row',alignItems:'center',gap:7,marginTop:18}}><Ionicons name={s.direction==='bullish'?'trending-up':s.direction==='bearish'?'trending-down':'remove'} color={color} size={18}/><Text style={{color,fontSize:12}}>{s.directionLabel}</Text></View>{!compact&&s.quoteNote&&<Text style={{color:c.soft,fontSize:12,marginTop:12}}>{s.quoteNote}</Text>}<Text style={{color:c.dim,fontSize:10,marginTop:16}}>{s.asOf?`Based on prices through ${s.asOf}`:'Waiting for data'}{s.partial?' · Some data is missing':''}</Text></View>;
}
