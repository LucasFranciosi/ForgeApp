import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { C } from '../theme';

export function MiniBars({ values, accent = C.blue }: { values: number[]; accent?: string }) {
  return (
    <View style={styles.bars}>
      {values.map((value, i) => (
        <View key={i} style={[styles.bar, { height: `${value}%`, backgroundColor: accent }]} />
      ))}
    </View>
  );
}

export function Donut() {
  const size = 90;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const segments = [
    { pct: 25, color: C.red },
    { pct: 31, color: C.accent },
    { pct: 22, color: C.blue },
    { pct: 22, color: C.green },
  ];
  let offset = 0;

  return (
    <View style={styles.donutRow}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9EDF2" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const dash = (s.pct / 100) * c;
          const node = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          );
          offset += dash;
          return node;
        })}
      </Svg>
      <View style={styles.legend}>
        <Legend color={C.red} text="Críticas" />
        <Legend color={C.accent} text="Em execução" />
        <Legend color={C.blue} text="Planejadas" />
        <Legend color={C.green} text="Encerrar" />
      </View>
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

export function LineChart({ values, color = C.blue }: { values: number[]; color?: string }) {
  const width = 300;
  const height = 120;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.lineBox}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { height: 88, flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 10 },
  bar: { flex: 1, minHeight: 5, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.9 },
  donutRow: { flexDirection: 'row', gap: 18, alignItems: 'center', marginTop: 12 },
  legend: { gap: 7 },
  legendItem: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: C.muted },
  lineBox: { width: '100%', overflow: 'hidden', marginTop: 8 },
});
