import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { WorkOrder } from '../types';
import { C } from '../theme';

export function HomeScreen({
  orders,
  onOS,
  onMachine,
  onAgenda,
  onCloseOS,
}: {
  orders: WorkOrder[];
  onOS: () => void;
  onMachine: (id: string) => void;
  onAgenda: () => void;
  onCloseOS: (order: WorkOrder) => void;
}) {
  const open = orders.filter(o => o.status !== 'Encerrada');
  const critical = open.filter(o => o.priority === 'Crítica').length;
  const execution = open.filter(o => o.status === 'Em execução').length;
  const closable = open.filter(o => o.status === 'Pronta para encerrar').length;
  const closingOrder = open.find(o => o.status === 'Pronta para encerrar');

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.osHero} onPress={onOS}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroKicker}>ORDENS DE SERVIÇO</Text>
        <Text style={styles.heroTitle}>{open.length} OS abertas</Text>
        <Text style={styles.heroText}>{critical} críticas exigem ação imediata. Toque no card para abrir a gestão priorizada.</Text>
        <View style={styles.metrics}>
          <HeroMetric value={String(critical)} label="Críticas" />
          <HeroMetric value={String(execution)} label="Execução" />
          <HeroMetric value={String(closable)} label="Encerrar" />
          <HeroMetric value="4h" label="Maior parada" />
        </View>
      </Pressable>

      <Section title="Atenção" subtitle="notificações técnicas" />
      <View style={{ gap: 8 }}>
        <Attention critical title="PH-04 com vibração acima do padrão" detail="Corretiva aberta há 2h • provável acoplamento." tag="Crítica" onPress={() => onMachine('PH-04')} />
        <Attention title="Documentação da PH-04 incompleta" detail="Diagrama de automação ausente para a configuração atual." tag="Docs" onPress={() => onMachine('PH-04')} />
        <Attention title="CNC-05 entra em janela preventiva amanhã" detail="Equipe e parada já reservadas." tag="Agenda" onPress={onAgenda} />
      </View>

      <Section title="Hoje" subtitle="prioridades operacionais" />
      <View style={{ gap: 10 }}>
        <TodayCard icon="alert-outline" tone="red" title="PH-04 · corretiva no acoplamento" detail="Impacto direto na parada programada da linha." tag="Alta" onPress={() => onMachine('PH-04')} />
        <TodayCard icon="calendar-check-outline" tone="blue" title="CNC-05 · inspeção planejada" detail="Janela confirmada para amanhã • 2h." tag="Média" onPress={onAgenda} />
        {closingOrder && (
          <TodayCard icon="check-decagram-outline" tone="green" title={`${closingOrder.machineId} · pronta para encerramento`} detail="Foto e assinatura obrigatórias para fechar a OS." tag="Encerrar" onPress={() => onCloseOS(closingOrder)} />
        )}
      </View>
    </ScrollView>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>;
}
function Attention({ critical, title, detail, tag, onPress }: { critical?: boolean; title: string; detail: string; tag: string; onPress: () => void }) {
  return (
    <Pressable style={styles.attention} onPress={onPress}>
      <View style={[styles.attentionLine, critical && { backgroundColor: C.red }]} />
      <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{detail}</Text></View>
      <View style={[styles.tag, critical && { backgroundColor: C.redSoft }]}><Text style={[styles.tagText, critical && { color: C.red }]}>{tag}</Text></View>
    </Pressable>
  );
}
function TodayCard({ icon, tone, title, detail, tag, onPress }: { icon: string; tone: 'red'|'blue'|'green'; title: string; detail: string; tag: string; onPress: () => void }) {
  const color = tone === 'red' ? C.red : tone === 'blue' ? '#5E83D7' : C.green;
  const soft = tone === 'red' ? C.redSoft : tone === 'blue' ? C.blueSoft : C.greenSoft;
  return (
    <Pressable style={styles.today} onPress={onPress}>
      <View style={[styles.todayIcon, { backgroundColor: soft }]}><Icon name={icon as any} size={20} color={color} /></View>
      <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{detail}</Text></View>
      <View style={[styles.tag, { backgroundColor: soft }]}><Text style={[styles.tagText, { color }]}>{tag}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  osHero: { minHeight: 205, borderRadius: 28, padding: 18, backgroundColor: C.dark, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 55, backgroundColor: 'rgba(239,160,51,0.25)', right: -40, top: -45, transform: [{ rotate: '15deg' }] },
  heroKicker: { fontSize: 10, letterSpacing: 1.3, color: 'rgba(255,255,255,0.55)', fontWeight: '800' },
  heroTitle: { fontSize: 30, letterSpacing: -1.4, fontWeight: '800', color: '#FFF', marginTop: 8 },
  heroText: { fontSize: 11, lineHeight: 17, color: 'rgba(255,255,255,0.64)', marginTop: 4, maxWidth: 330 },
  metrics: { flexDirection: 'row', gap: 7, marginTop: 16 },
  metric: { flex: 1, borderRadius: 15, padding: 9, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  metricLabel: { fontSize: 8, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionSubtitle: { fontSize: 10, color: C.muted },
  attention: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  attentionLine: { width: 7, height: 48, borderRadius: 4, backgroundColor: C.accent },
  cardTitle: { fontSize: 12, fontWeight: '800' },
  cardText: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 4 },
  tag: { paddingHorizontal: 9, paddingVertical: 7, backgroundColor: C.accentSoft, borderRadius: 999 },
  tagText: { fontSize: 9, fontWeight: '800', color: '#92580A' },
  today: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 14, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  todayIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
