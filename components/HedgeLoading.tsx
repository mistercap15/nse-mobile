import React,{useEffect,useRef} from 'react';
import {Animated,View,Text,ActivityIndicator} from 'react-native';
import {useColors,useReducedMotion} from '@/lib/theme';
export function HedgeLoading({label='Checking your stock…'}:{label?:string}){
 const c=useColors();const reduced=useReducedMotion();const opacity=useRef(new Animated.Value(1)).current;
 useEffect(()=>{if(reduced){opacity.setValue(1);return;}const animation=Animated.loop(Animated.sequence([Animated.timing(opacity,{toValue:.35,duration:750,useNativeDriver:true}),Animated.timing(opacity,{toValue:1,duration:750,useNativeDriver:true})]));animation.start();return()=>animation.stop();},[reduced,opacity]);
 return <View accessibilityRole="progressbar" accessibilityLabel={label} style={{backgroundColor:c.card,borderWidth:1,borderColor:c.border,borderRadius:20,padding:22}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}>{!reduced&&<ActivityIndicator color={c.accent}/>}<Text style={{color:c.accent,fontSize:13,fontWeight:'600'}}>{label}</Text></View><Animated.View style={{opacity,marginTop:24,gap:12}}><View style={{height:25,width:'75%',backgroundColor:c.border,borderRadius:7}}/><View style={{height:10,backgroundColor:c.border,borderRadius:5}}/><View style={{height:10,width:'60%',backgroundColor:c.border,borderRadius:5}}/></Animated.View></View>;
}
