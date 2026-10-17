import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { C } from '../theme';
import { LocalModelSnapshot } from '../core/domain/LocalModel';

export function AIPanel({ visible, onClose, models }: { visible: boolean; onClose: () => void; models: LocalModelSnapshot[] }) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [thinking, setThinking] = useState(false);

  const ready = models.some(model => model.type === 'llm' && model.status === 'ready');
  const ask = () => {
    if (!text.trim()) return setResponse('Digite uma pergunta técnica.');
    if (!ready) return setResponse('A IA permanece offline e nenhum LLM local foi provisionado. Importe um modelo compatível no catálogo local antes de consultar o histórico.');
    setThinking(true);
    setResponse('');
    setTimeout(() => {
      setResponse('Resposta simulada: a PH-04 tem vibração crescente no acoplamento. Recomendo inspecionar o alinhamento, comparar com o datasheet WEG W22 e priorizar a OS corretiva aberta.');
      setThinking(false);
    }, 450);
  };

  const prompts = [
    'Resuma o histórico técnico da PH-04.',
    'Quais documentos estão pendentes?',
    'Quais OS causam maior impacto?',
    'Analise a vibração atual.',
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <View style={styles.titleWrap}>
              <View style={styles.orb}><Icon name="robot-outline" size={21} color={C.ink} /></View>
              <View><Text style={styles.title}>IA técnica local</Text><Text style={styles.subtitle}>Sem rede • evidências e histórico locais</Text></View>
            </View>
            <Pressable onPress={onClose}><Icon name="close" size={22} color="#FFF" /></Pressable>
          </View>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Pergunte sobre manual, datasheet, histórico, componente ou análise..."
            placeholderTextColor="#8E949E"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prompts}>
            {prompts.map(p => <Pressable key={p} style={styles.prompt} onPress={() => setText(p)}><Text style={styles.promptText}>{p}</Text></Pressable>)}
          </ScrollView>

          <View style={styles.catalog}>
            <Text style={styles.catalogTitle}>CATÁLOGO LOCAL</Text>
            {(['llm', 'embedding', 'whisper', 'vision'] as const).map(type => {
              const model = models.find(item => item.type === type);
              const status = model?.status ?? 'absent';
              return <View key={type} style={styles.modelRow}><Text style={styles.modelName}>{model?.name ?? type.toUpperCase()}</Text><Text style={[styles.modelState, status === 'ready' && styles.modelReady]}>{status === 'ready' ? 'pronto' : status === 'failed' ? 'falhou' : 'ausente'}</Text></View>;
            })}
          </View>

          <Pressable style={styles.send} onPress={ask}><Text style={styles.sendText}>{thinking ? 'Analisando…' : 'Enviar'}</Text></Pressable>
          {thinking && <Text style={styles.thinking}>Consultando telemetria, histórico e documentação local…</Text>}
          {!!response && <Text style={styles.response}>{response}</Text>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,15,20,0.42)' },
  panel: { backgroundColor: '#181B21', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingTop: 10, maxHeight: '78%' },
  grab: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#3A404A', alignSelf: 'center', marginBottom: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orb: { width: 38, height: 38, borderRadius: 14, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  subtitle: { color: '#8E949E', fontSize: 9, marginTop: 2 },
  input: { marginTop: 12, minHeight: 118, borderRadius: 18, backgroundColor: '#232730', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 13, color: '#FFF', textAlignVertical: 'top' },
  prompts: { gap: 7, paddingTop: 10 },
  prompt: { backgroundColor: '#232730', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 10, paddingVertical: 9 },
  promptText: { color: '#D8DDE5', fontSize: 9 },
  send: { alignSelf: 'flex-end', borderRadius: 13, backgroundColor: C.accent2, paddingHorizontal: 16, paddingVertical: 11, marginTop: 10 },
  sendText: { color: C.ink, fontWeight: '800', fontSize: 11 },
  response: { marginTop: 10, color: '#CFD4DD', fontSize: 10, lineHeight: 16, backgroundColor: '#232730', padding: 12, borderRadius: 16 },
  thinking: { marginTop: 10, color: '#B9C2CE', fontSize: 10 },
  catalog: { marginTop: 12, borderRadius: 14, backgroundColor: '#232730', padding: 10 },
  catalogTitle: { color: '#8E949E', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  modelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  modelName: { color: '#D8DDE5', fontSize: 10, textTransform: 'uppercase' },
  modelState: { color: '#E8B55D', fontSize: 10, fontWeight: '700' },
  modelReady: { color: '#74C69D' },
});
