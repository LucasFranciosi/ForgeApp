import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { C } from '../theme';

export type ContextAction = { label: string; icon: string; onPress: () => void };
export function ContextualFab({ actions }: { actions: ContextAction[] }) {
  const [open, setOpen] = useState(false);
  if (!actions.length) return null;
  return <><Pressable accessibilityLabel="Adicionar" style={styles.fab} onPress={() => setOpen(true)}><Icon name="plus" color="#FFF" size={28} /></Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}><View style={styles.root}><Pressable style={styles.backdrop} onPress={() => setOpen(false)} /><View style={styles.sheet}><View style={styles.grab} /><Text style={styles.kicker}>ADICIONAR</Text><Text style={styles.title}>O que deseja registrar?</Text>{actions.map(action => <Pressable key={action.label} style={styles.action} onPress={() => { setOpen(false); action.onPress(); }}><View style={styles.icon}><Icon name={action.icon as any} size={20} color="#92580A" /></View><Text style={styles.label}>{action.label}</Text><Icon name="chevron-right" size={20} color={C.muted} /></Pressable>)}</View></View></Modal></>;
}
const styles = StyleSheet.create({ fab:{position:'absolute',right:20,bottom:94,width:56,height:56,borderRadius:20,backgroundColor:C.dark,alignItems:'center',justifyContent:'center',elevation:8},root:{flex:1,justifyContent:'flex-end'},backdrop:{...StyleSheet.absoluteFill,backgroundColor:'rgba(12,15,20,.45)'},sheet:{backgroundColor:'#FFF',padding:18,paddingBottom:30,borderTopLeftRadius:28,borderTopRightRadius:28},grab:{width:40,height:4,borderRadius:2,backgroundColor:'#D8DBE1',alignSelf:'center',marginBottom:16},kicker:{fontSize:9,fontWeight:'800',letterSpacing:1.1,color:C.muted},title:{fontSize:20,fontWeight:'800',marginTop:4,marginBottom:14},action:{minHeight:58,flexDirection:'row',alignItems:'center',gap:11,borderTopWidth:1,borderTopColor:'#EEF0F3'},icon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:C.accentSoft},label:{flex:1,fontSize:12,fontWeight:'800'} });
