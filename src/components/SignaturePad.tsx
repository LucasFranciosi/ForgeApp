import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { C } from '../theme';

type Point = { x: number; y: number };
type Props = {
  onChange: (hasSignature: boolean) => void;
};

export function SignaturePad({ onChange }: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const activeStroke = useRef<Point[]>([]);

  const addPoint = (x: number, y: number) => {
    activeStroke.current = [...activeStroke.current, { x, y }];
    const current = activeStroke.current;
    setStrokes(prev => {
      if (!prev.length) return [current];
      return [...prev.slice(0, -1), current];
    });
    onChange(true);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          activeStroke.current = [];
          setStrokes(prev => [...prev, []]);
          addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
        },
        onPanResponderMove: e => {
          addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          activeStroke.current = [];
        },
        onPanResponderTerminate: () => {
          activeStroke.current = [];
        },
      }),
    []
  );

  const clear = () => {
    setStrokes([]);
    activeStroke.current = [];
    onChange(false);
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <Text style={styles.label}>Assinatura do responsável</Text>
        <Text style={styles.clear} onPress={clear}>Limpar</Text>
      </View>
      <View style={styles.canvas} {...pan.panHandlers}>
        <Svg width="100%" height="100%">
          {strokes.map((stroke, index) => (
            <Polyline
              key={index}
              points={stroke.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={C.dark}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: C.ink },
  clear: { fontSize: 11, fontWeight: '800', color: '#985D09' },
  canvas: {
    height: 165,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D7DBE1',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
});
