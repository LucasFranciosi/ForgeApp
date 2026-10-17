import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AgendaItem, Machine, Priority, WorkOrder } from '../types';
import { C } from '../theme';
import { SignaturePad } from './SignaturePad';

function Sheet({
  visible,
  title,
  crumb,
  onClose,
  children,
}: React.PropsWithChildren<{ visible: boolean; title: string; crumb: string; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={styles.crumb}>{crumb}</Text>
            <Text style={styles.title}>{title}</Text>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const priorities: Priority[] = ['Crítica', 'Alta', 'Média', 'Baixa'];

export function CreateOSSheet({
  visible,
  machines,
  onClose,
  onCreate,
}: {
  visible: boolean;
  machines: Machine[];
  onClose: () => void;
  onCreate: (item: WorkOrder) => void;
}) {
  const [machineId, setMachineId] = useState(machines[0]?.id ?? '');
  const [type, setType] = useState<WorkOrder['type']>('Corretiva');
  const [priority, setPriority] = useState<Priority>('Alta');
  const [component, setComponent] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('2h');

  const create = () => {
    if (!description.trim()) {
      Alert.alert('Descrição necessária', 'Descreva o problema ou objetivo da intervenção.');
      return;
    }
    onCreate({
      id: `OS-${Date.now()}`,
      machineId,
      title: component.trim() ? `${type} • ${component.trim()}` : type,
      type,
      priority,
      status: 'Aberta',
      specialty: 'A definir',
      duration,
      description,
      progress: 10,
    });
    setDescription('');
    setComponent('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} crumb="NOVA ORDEM DE SERVIÇO" title="Criar OS">
      <Text style={styles.help}>A OS é criada e notificada imediatamente.</Text>
      <Label text="Máquina" />
      <ChipRow values={machines.map(m => m.id)} value={machineId} onChange={setMachineId} />
      <Label text="Tipo" />
      <ChipRow values={['Corretiva', 'Preventiva', 'Inspeção']} value={type} onChange={v => setType(v as WorkOrder['type'])} />
      <Label text="Prioridade" />
      <ChipRow values={priorities} value={priority} onChange={v => setPriority(v as Priority)} />
      <Label text="Componente" />
      <TextInput style={styles.input} value={component} onChangeText={setComponent} placeholder="Ex.: Acoplamento" />
      <Label text="Problema / intervenção" />
      <TextInput style={[styles.input, styles.area]} value={description} onChangeText={setDescription} multiline placeholder="Descreva o sintoma ou intervenção..." />
      <Label text="Duração estimada" />
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} />
      <Pressable style={styles.primary} onPress={create}><Text style={styles.primaryText}>Criar OS e notificar</Text></Pressable>
    </Sheet>
  );
}

export function CreateAgendaSheet({
  visible,
  machines,
  onClose,
  onCreate,
}: {
  visible: boolean;
  machines: Machine[];
  onClose: () => void;
  onCreate: (item: AgendaItem) => void;
}) {
  const [machineId, setMachineId] = useState(machines[0]?.id ?? '');
  const [kind, setKind] = useState<AgendaItem['kind']>('Preventiva');
  const [date, setDate] = useState('2026-09-18');
  const [time, setTime] = useState('08:30');
  const [duration, setDuration] = useState('2h');
  const [team, setTeam] = useState('Mecânica 2');
  const [title, setTitle] = useState('Janela de manutenção');

  const create = () => {
    onCreate({
      id: `AG-${Date.now()}`,
      machineId,
      date,
      time,
      duration,
      title,
      team,
      kind,
      priority: 'Média',
    });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} crumb="AGENDA DE MANUTENÇÃO" title="Criar agenda">
      <Text style={styles.help}>No backend, esta ação deverá validar conflitos de máquina, equipe e produção.</Text>
      <Label text="Máquina" />
      <ChipRow values={machines.map(m => m.id)} value={machineId} onChange={setMachineId} />
      <Label text="Tipo" />
      <ChipRow values={['Preventiva', 'Inspeção', 'Parada técnica', 'Corretiva']} value={kind} onChange={v => setKind(v as AgendaItem['kind'])} />
      <Label text="Descrição" />
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <View style={styles.two}>
        <View style={{ flex: 1 }}><Label text="Data" /><TextInput style={styles.input} value={date} onChangeText={setDate} /></View>
        <View style={{ flex: 1 }}><Label text="Hora" /><TextInput style={styles.input} value={time} onChangeText={setTime} /></View>
      </View>
      <View style={styles.two}>
        <View style={{ flex: 1 }}><Label text="Duração" /><TextInput style={styles.input} value={duration} onChangeText={setDuration} /></View>
        <View style={{ flex: 1 }}><Label text="Equipe" /><TextInput style={styles.input} value={team} onChangeText={setTeam} /></View>
      </View>
      <Pressable style={styles.primary} onPress={create}><Text style={styles.primaryText}>Criar agenda</Text></Pressable>
    </Sheet>
  );
}

export function CloseOSSheet({
  visible,
  order,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  order: WorkOrder | null;
  onClose: () => void;
  onConfirm: (id: string, evidence: { photo: boolean; signature: boolean }) => boolean | Promise<boolean>;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Câmera necessária', 'Permita o acesso à câmera para registrar a evidência.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
    if (!result.canceled && result.assets[0]?.uri) setPhoto(result.assets[0].uri);
  };

  const gallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (!result.canceled && result.assets[0]?.uri) setPhoto(result.assets[0].uri);
  };

  const confirm = async () => {
    if (!order) return;
    if (!photo) {
      Alert.alert('Foto obrigatória', 'Registre uma foto da intervenção.');
      return;
    }
    if (!signed) {
      Alert.alert('Assinatura obrigatória', 'Colete a assinatura do responsável.');
      return;
    }
    const closed = await onConfirm(order.id, { photo: !!photo, signature: signed });
    if (!closed) return;
    setPhoto(null);
    setSigned(false);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} crumb="ENCERRAR ORDEM DE SERVIÇO" title={order ? order.id : 'Fechamento'}>
      <Text style={styles.help}>Foto e assinatura são evidências obrigatórias.</Text>

      <View style={styles.photoBox}>
        <Icon name="camera-outline" size={24} color={C.muted} />
        <Text style={styles.photoTitle}>Evidência fotográfica</Text>
        <View style={styles.two}>
          <Pressable style={styles.secondary} onPress={takePhoto}><Text style={styles.secondaryText}>Fotografar</Text></Pressable>
          <Pressable style={styles.secondary} onPress={gallery}><Text style={styles.secondaryText}>Galeria</Text></Pressable>
        </View>
        {photo && <Image source={{ uri: photo }} style={styles.preview} />}
      </View>

      <View style={styles.signatureBox}>
        <SignaturePad onChange={setSigned} />
      </View>

      <Pressable style={styles.primary} onPress={confirm}><Text style={styles.primaryText}>Encerrar OS</Text></Pressable>
    </Sheet>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ChipRow({
  values,
  value,
  onChange,
}: {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {values.map(item => (
        <Pressable key={item} style={[styles.chip, item === value && styles.chipActive]} onPress={() => onChange(item)}>
          <Text style={[styles.chipText, item === value && styles.chipTextActive]}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,15,20,0.42)' },
  sheet: { maxHeight: '90%', backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingTop: 10 },
  sheetContent: { paddingBottom: 28 },
  grab: { width: 42, height: 4, backgroundColor: '#D8DBE1', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  crumb: { fontSize: 10, letterSpacing: 1.2, color: '#89909B', fontWeight: '800' },
  title: { fontSize: 21, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  help: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 6, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: '800', color: C.muted, marginTop: 12, marginBottom: 6 },
  chips: { gap: 7, paddingRight: 12 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#FFF' },
  chipActive: { backgroundColor: C.dark, borderColor: C.dark },
  chipText: { fontSize: 10, color: '#666C76' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: '#F9FAFB', padding: 12, color: C.ink },
  area: { minHeight: 90, textAlignVertical: 'top' },
  two: { flexDirection: 'row', gap: 9 },
  primary: { height: 50, borderRadius: 15, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  secondary: { flex: 1, height: 42, borderRadius: 13, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  secondaryText: { fontSize: 10, fontWeight: '800', color: C.ink },
  photoBox: { marginTop: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D6DAE0', backgroundColor: '#F7F9FB', borderRadius: 18, padding: 14, alignItems: 'center', gap: 8 },
  photoTitle: { fontSize: 11, fontWeight: '800' },
  preview: { width: '100%', height: 180, borderRadius: 14, marginTop: 4 },
  signatureBox: { marginTop: 12, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 10 },
});
