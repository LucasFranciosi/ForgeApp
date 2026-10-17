import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { C } from '../theme';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.blueBlob} />
      <View style={styles.orangeBlob} />

      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.logo}><Icon name="lightning-bolt" size={22} color={C.ink} /></View>
          <Text style={styles.brandText}>FORGE</Text>
        </View>
        <Text style={styles.kicker}>TECHNICAL OS</Text>
      </View>

      <View style={styles.main}>
        <Text style={styles.kicker}>INDUSTRIAL MAINTENANCE</Text>
        <Text style={styles.title}>Operação técnica{'\n'}sem virar planilha.</Text>
        <Text style={styles.subtitle}>Máquinas, componentes, agenda, telemetria e ordens de serviço conectados ao contexto real do equipamento.</Text>

        <View style={styles.field}>
          <View style={styles.fieldIcon}><Icon name="account-outline" size={18} color="#656B74" /></View>
          <TextInput style={styles.input} defaultValue="vini@forge.local" autoCapitalize="none" />
        </View>
        <View style={styles.field}>
          <View style={styles.fieldIcon}><Icon name="key-outline" size={18} color="#656B74" /></View>
          <TextInput style={styles.input} defaultValue="123456" secureTextEntry />
        </View>

        <Pressable style={styles.login} onPress={onLogin}>
          <Text style={styles.loginText}>Entrar no ambiente técnico</Text>
          <Icon name="arrow-right" size={18} color={C.ink} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Protótipo funcional</Text>
        <Text style={styles.footerText}>Offline-ready</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F9', padding: 22, overflow: 'hidden' },
  blueBlob: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(111,159,255,0.16)', left: -100, top: -70 },
  orangeBlob: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(239,160,51,0.16)', right: -100, top: -100 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logo: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.7 },
  kicker: { fontSize: 10, letterSpacing: 1.4, color: '#858C96', fontWeight: '800' },
  main: { marginTop: 'auto', marginBottom: 12 },
  title: { fontSize: 42, lineHeight: 43, letterSpacing: -2.3, fontWeight: '800', marginTop: 10, color: C.ink },
  subtitle: { fontSize: 14, lineHeight: 22, color: C.muted, marginTop: 12, marginBottom: 26 },
  field: { height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 },
  fieldIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F3F5F8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  input: { flex: 1, color: C.ink },
  login: { height: 56, borderRadius: 18, backgroundColor: C.accent2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4 },
  loginText: { fontSize: 12, fontWeight: '800', color: C.ink },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  footerText: { fontSize: 10, color: '#8C929C' },
});
