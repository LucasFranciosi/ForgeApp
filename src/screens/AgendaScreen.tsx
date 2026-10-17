import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { AgendaItem, Machine } from '../types';
import { C } from '../theme';

type Mode = 'Hoje' | 'Semana' | 'Mês';

export function AgendaScreen({ agenda, machines }: { agenda: AgendaItem[]; machines: Machine[] }) {
  const [mode, setMode] = useState<Mode>('Hoje');

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.tabs}>
        {(['Hoje','Semana','Mês'] as Mode[]).map(x => (
          <Pressable key={x} style={[styles.tab, mode === x && styles.tabActive]} onPress={() => setMode(x)}>
            <Text style={[styles.tabText, mode === x && styles.tabTextActive]}>{x}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'Hoje' && <Day agenda={agenda} />}
      {mode === 'Semana' && <Week agenda={agenda} />}
      {mode === 'Mês' && <Month agenda={agenda} machines={machines} />}
    </ScrollView>
  );
}

function Day({ agenda }: { agenda: AgendaItem[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const items = agenda.filter(a => a.date === today);
  return <View style={{ gap: 10 }}>{items.length ? items.map(a => <AgendaCard key={a.id} item={a} />) : <Text style={styles.empty}>Nenhuma referência operacional para hoje.</Text>}</View>;
}
function AgendaCard({ item }: { item: AgendaItem }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{item.time} · {item.machineId} · {item.title}</Text><Text style={styles.cardText}>{item.priority} • {item.duration} • {item.team}</Text></View>;
}

function Week({ agenda }: { agenda: AgendaItem[] }) {
  const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const days = ['SEG','TER','QUA','QUI','SEX','SAB','DOM'].map((name, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return [name, day.toISOString().slice(0, 10), String(day.getDate())] as const; });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.week}>
        {days.map(([name, date, day]) => {
          const items = agenda.filter(a => a.date === date);
          return (
            <View key={day} style={styles.dayCol}>
              <Text style={styles.dayName}>{name}</Text><Text style={styles.dayDate}>{day}</Text>
              {items.map(item => <View key={item.id} style={[styles.weekTask, item.priority === 'Crítica' && styles.weekCritical]}><Text style={styles.weekText}>{item.machineId} • {item.title}</Text><Text style={styles.weekMeta}>{item.duration}</Text></View>)}
              {!items.length && <Text style={styles.empty}>Janela livre</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Month({ agenda, machines }: { agenda: AgendaItem[]; machines: Machine[] }) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const byMachine = useMemo(() => {
    const map = new Map<string, Map<number, AgendaItem[]>>();
    machines.forEach(m => map.set(m.id, new Map()));
    agenda.forEach(a => {
      const day = Number(a.date.slice(-2));
      const machineMap = map.get(a.machineId) ?? new Map<number, AgendaItem[]>();
      machineMap.set(day, [...(machineMap.get(day) ?? []), a]);
      map.set(a.machineId, machineMap);
    });
    return map;
  }, [agenda, machines]);

  return (
    <View style={styles.monthOuter}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.monthRow}>
            <View style={styles.machineName}><Text style={styles.monthHeader}>MÁQUINA</Text></View>
            {days.map(d => <View key={d} style={styles.monthCell}><Text style={styles.monthHeader}>{d}</Text></View>)}
          </View>

          {machines.map(machine => (
            <View key={machine.id} style={styles.monthRow}>
              <View style={styles.machineName}><Text style={styles.machineNameText}>{machine.id}</Text></View>
              {days.map(day => {
                const items = byMachine.get(machine.id)?.get(day) ?? [];
                const item = items[0];
                return (
                  <View key={day} style={[styles.monthCell, item && cellTone(item.priority)]}>
                    <Text style={[styles.monthMark, item && { color: toneColor(item.priority) }]}>{item ? mark(item.kind) : ''}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.legend}>P preventiva • I inspeção • C corretiva • T parada técnica</Text>
    </View>
  );
}

function mark(kind: AgendaItem['kind']) {
  return kind === 'Preventiva' ? 'P' : kind === 'Inspeção' ? 'I' : kind === 'Corretiva' ? 'C' : 'T';
}
function toneColor(priority: AgendaItem['priority']) {
  return priority === 'Crítica' ? C.red : priority === 'Alta' ? '#92580A' : priority === 'Média' ? '#5D83D9' : C.green;
}
function cellTone(priority: AgendaItem['priority']) {
  return { backgroundColor: priority === 'Crítica' ? C.redSoft : priority === 'Alta' ? C.accentSoft : priority === 'Média' ? C.blueSoft : C.greenSoft };
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFF', paddingHorizontal: 13, paddingVertical: 10 },
  tabActive: { backgroundColor: C.dark, borderColor: C.dark },
  tabText: { fontSize: 11, color: '#666C76' },
  tabTextActive: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 14 },
  cardTitle: { fontSize: 12, fontWeight: '800' },
  cardText: { fontSize: 10, color: C.muted, marginTop: 4 },
  week: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  dayCol: { width: 132, minHeight: 275, backgroundColor: '#F7F9FB', borderWidth: 1, borderColor: '#EDF0F4', borderRadius: 18, padding: 10 },
  dayName: { fontSize: 11, fontWeight: '800' },
  dayDate: { fontSize: 9, color: C.muted, marginTop: 2 },
  weekTask: { marginTop: 10, padding: 9, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  weekCritical: { backgroundColor: '#FFF6F5', borderColor: '#F2C9C5' },
  weekText: { fontSize: 9, fontWeight: '700', lineHeight: 13 },
  weekMeta: { fontSize: 8, color: C.muted, marginTop: 4 },
  empty: { fontSize: 9, color: C.muted, marginTop: 14 },
  monthOuter: { backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingVertical: 12, overflow: 'hidden' },
  monthRow: { flexDirection: 'row', paddingHorizontal: 8, gap: 4, marginBottom: 4 },
  machineName: { width: 74, height: 34, justifyContent: 'center', backgroundColor: '#FFF' },
  machineNameText: { fontSize: 10, fontWeight: '800' },
  monthCell: { width: 36, height: 34, borderRadius: 9, backgroundColor: '#F6F8FB', borderWidth: 1, borderColor: '#EDF0F4', alignItems: 'center', justifyContent: 'center' },
  monthHeader: { fontSize: 8, color: C.muted, fontWeight: '700' },
  monthMark: { fontSize: 9, fontWeight: '800' },
  legend: { fontSize: 8, color: C.muted, paddingHorizontal: 12, marginTop: 8 },
});
