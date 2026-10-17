import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';
import { LineChart } from '../components/Charts';
import { DailyPerformance } from '../core/application/PerformanceService';
import { TelemetryMetric, TelemetryReadingSnapshot } from '../core/domain/Schedule';

export function TelemetryScreen({ machineId, performance, readings=[], onRecordOperation, onRecordReading }: { machineId: string; performance?: DailyPerformance; readings?:TelemetryReadingSnapshot[]; onRecordOperation: (type: 'productive'|'idle'|'setup'|'maintenance', startedAt: string, endedAt: string, notes: string) => Promise<boolean>; onRecordReading:(metric:TelemetryMetric,value:number,notes:string)=>Promise<boolean> }) {
  const [type, setType] = useState<'productive'|'idle'|'setup'|'maintenance'>('productive');
  const [startedAt, setStartedAt] = useState(new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [metric,setMetric]=useState<TelemetryMetric>('vibration'); const [value,setValue]=useState(''); const [readingNotes,setReadingNotes]=useState('');
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>TELEMETRIA DETALHADA</Text>
        <Text style={styles.title}>{machineId}</Text>
        <Text style={styles.subtitle}>Sinais operacionais, downtime, ciclos, tendências e eventos técnicos da máquina.</Text>
      </View>

      <View style={styles.metrics}>
        <Metric value={performance?.availabilityPercent == null ? '—' : `${performance.availabilityPercent.toFixed(1)}%`} label="Disponibilidade" />
        <Metric value={performance ? `${Math.round(performance.unplannedDowntimeMinutes)} min` : '—'} label="Parada não planejada" />
        <Metric value="—" label="Corrente manual" />
        <Metric value="—" label="Temperatura manual" />
        <Metric value="—" label="Vibração manual" />
        <Metric value={performance ? `${Math.round(performance.productiveMinutes)} min` : '—'} label="Produção registrada" />
      </View>

      <View style={styles.entry}><Text style={styles.entryTitle}>Lançar leitura manual</Text><Text style={styles.entryText}>Vibração, temperatura e corrente ficam no histórico local da máquina.</Text><View style={styles.types}>{(['vibration','temperature','current'] as const).map(item=><Pressable key={item} onPress={()=>setMetric(item)} style={[styles.type,metric===item&&styles.typeActive]}><Text style={[styles.typeText,metric===item&&styles.typeTextActive]}>{item==='vibration'?'Vibração':item==='temperature'?'Temperatura':'Corrente'}</Text></Pressable>)}</View><TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" style={styles.field} placeholder={metric==='vibration'?'mm/s':metric==='temperature'?'°C':'A'}/><TextInput value={readingNotes} onChangeText={setReadingNotes} style={styles.field} placeholder="Observação (opcional)"/><Pressable style={styles.record} onPress={()=>void onRecordReading(metric,Number(value.replace(',','.')),readingNotes).then(ok=>{if(ok){setValue('');setReadingNotes('');Alert.alert('Leitura gravada','A leitura foi salva no histórico local.');}})}><Text style={styles.recordText}>Gravar leitura</Text></Pressable>{readings.slice(0,3).map(item=><Text key={item.id} style={styles.entryText}>{new Date(item.measuredAt).toLocaleString('pt-BR')} · {item.metric}: {item.value} {item.unit}</Text>)}</View>

      <View style={styles.entry}><Text style={styles.entryTitle}>Lançar período operacional</Text><Text style={styles.entryText}>Registro manual local; períodos do mesmo tipo não podem se sobrepor.</Text><View style={styles.types}>{(['productive','idle','setup','maintenance'] as const).map(item=><Pressable key={item} onPress={()=>setType(item)} style={[styles.type,type===item&&styles.typeActive]}><Text style={[styles.typeText,type===item&&styles.typeTextActive]}>{item==='productive'?'Produção':item==='idle'?'Ociosa':item==='setup'?'Setup':'Manutenção'}</Text></Pressable>)}</View><TextInput value={startedAt} onChangeText={setStartedAt} style={styles.field} placeholder="Início ISO"/><TextInput value={endedAt} onChangeText={setEndedAt} style={styles.field} placeholder="Fim ISO"/><TextInput value={notes} onChangeText={setNotes} style={styles.field} placeholder="Observação (opcional)"/><Pressable style={styles.record} onPress={()=>void onRecordOperation(type,startedAt,endedAt,notes).then(ok=>ok&&Alert.alert('Período gravado','Os indicadores locais foram recalculados.'))}><Text style={styles.recordText}>Gravar período</Text></Pressable></View>

      <ChartCard title="Vibração nas últimas horas" unit="mm/s" values={[1.1,1.2,1.15,1.4,1.6,1.8,1.7,2.0,1.9,2.1]} color={C.accent} />
      <ChartCard title="Temperatura do motor" unit="°C" values={[48,50,52,54,56,59,61,60,62,62]} color={C.red} />
      <ChartCard title="Corrente do acionamento" unit="A" values={[15.1,16.4,15.8,17.2,18.1,17.8,18.4,22.4,18.8,18.4]} color={C.blue} />

      <Text style={styles.section}>Eventos recentes</Text>
      <View style={{ gap: 8 }}>
        <Event title="14:42 · vibração acima do limite de atenção" detail="2,1 mm/s • acoplamento em análise" />
        <Event title="13:18 · pico de corrente" detail="22,4 A por 12 segundos" />
        <Event title="10:04 · retomada de produção" detail="Máquina ficou parada por 38 minutos" />
      </View>
    </ScrollView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
function ChartCard({ title, unit, values, color }: { title: string; unit: string; values: number[]; color: string }) {
  return <View style={styles.chart}><View style={styles.chartHead}><Text style={styles.chartTitle}>{title}</Text><Text style={styles.unit}>{unit}</Text></View><LineChart values={values} color={color} /></View>;
}
function Event({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.event}><Text style={styles.eventTitle}>{title}</Text><Text style={styles.eventDetail}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  hero: { borderRadius: 28, padding: 18, backgroundColor: C.dark },
  kicker: { fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)', fontWeight: '800' },
  title: { fontSize: 29, fontWeight: '800', letterSpacing: -1, color: '#FFF', marginTop: 6 },
  subtitle: { fontSize: 10, lineHeight: 15, color: 'rgba(255,255,255,0.62)', marginTop: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 },
  metric: { width: '48.5%', backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 14 },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 9, color: C.muted, marginTop: 2 },
  chart: { marginTop: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 14 },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between' },
  chartTitle: { fontSize: 12, fontWeight: '800' },
  unit: { fontSize: 9, color: C.muted },
  section: { fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  event: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#EDF0F4', borderRadius: 16, padding: 11 },
  eventTitle: { fontSize: 10, fontWeight: '800' },
  eventDetail: { fontSize: 9, color: C.muted, marginTop: 3 },
  entry:{marginTop:12,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,borderRadius:22,padding:14},entryTitle:{fontSize:12,fontWeight:'800'},entryText:{fontSize:9,color:C.muted,marginTop:3},types:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:10},type:{padding:8,borderRadius:10,borderWidth:1,borderColor:C.line},typeActive:{backgroundColor:C.dark,borderColor:C.dark},typeText:{fontSize:9,color:C.muted},typeTextActive:{color:'#FFF'},field:{borderWidth:1,borderColor:C.line,borderRadius:10,padding:9,fontSize:10,marginTop:8},record:{height:42,marginTop:9,borderRadius:12,backgroundColor:C.dark,alignItems:'center',justifyContent:'center'},recordText:{color:'#FFF',fontSize:10,fontWeight:'800'},
});
