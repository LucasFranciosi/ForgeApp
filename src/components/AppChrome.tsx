import React, { useMemo, useRef } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { C } from '../theme';
import { ScreenKey } from '../types';
import { Donut, MiniBars } from './Charts';

export function Header({
  crumb,
  title,
  notificationCount,
  onNotifications,
  onMore,
}: {
  crumb: string;
  title: string;
  notificationCount: number;
  onNotifications: () => void;
  onMore?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.crumb}>{crumb}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.headerActions}>{onMore && <Pressable accessibilityLabel="Mais opções" style={styles.iconButton} onPress={onMore}><Icon name="dots-horizontal" size={22} color={C.ink} /></Pressable>}<Pressable style={styles.iconButton} onPress={onNotifications}>
          <Icon name="bell-outline" size={21} color={C.ink} />
          {notificationCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{notificationCount}</Text></View>
          )}
        </Pressable></View>
    </View>
  );
}

const nav: { key: ScreenKey | 'ai'; label: string; icon: string }[] = [
  { key: 'home', label: 'Hoje', icon: 'home-outline' },
  { key: 'machines', label: 'Máquinas', icon: 'factory' },
  { key: 'os', label: 'OS', icon: 'wrench-outline' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar-month-outline' },
  { key: 'ai', label: 'IA', icon: 'robot-outline' },
];

export function BottomNav({
  active,
  onNavigate,
  onAI,
}: {
  active: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  onAI: () => void;
}) {
  return (
    <View style={styles.bottom}>
      {nav.map(item => {
        const isAI = item.key === 'ai';
        const activeItem = item.key === active;
        return (
          <Pressable
            key={item.key}
            style={styles.navItem}
            onPress={() => (isAI ? onAI() : onNavigate(item.key as ScreenKey))}
          >
            <View style={[styles.navIcon, activeItem && styles.navIconActive, isAI && styles.navIconAI]}>
              <Icon name={item.icon as any} size={20} color={isAI ? C.ink : activeItem ? '#965B09' : '#9BA0A9'} />
            </View>
            <Text style={[styles.navLabel, activeItem && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DrawerHandle({ onOpen }: { onOpen: () => void }) {
  const startX = useRef(0);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          startX.current = e.nativeEvent.pageX;
        },
        onPanResponderMove: e => {
          if (startX.current - e.nativeEvent.pageX > 45) {
            startX.current = -9999;
            onOpen();
          }
        },
      }),
    [onOpen]
  );

  return (
    <View style={styles.drawerHandle} {...pan.panHandlers}>
      <View style={styles.drawerGrip} />
    </View>
  );
}

export function SidePanel({
  visible,
  onClose,
  onCreateOS,
  onCreateAgenda,
  onStructure,
  onPreventives,
  onDocuments,
}: {
  visible: boolean;
  onClose: () => void;
  onCreateOS: () => void;
  onCreateAgenda: () => void;
  onStructure: () => void;
  onPreventives: () => void;
  onDocuments: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sidePanel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.crumb}>PAINEL LATERAL</Text>
                <Text style={styles.panelTitle}>Performance & análises</Text>
              </View>
              <Pressable style={styles.iconButton} onPress={onClose}>
                <Icon name="close" size={20} color={C.ink} />
              </Pressable>
            </View>

            <View style={styles.panelGrid}>
              <Metric value="6h12" label="Downtime hoje" />
              <Metric value="92%" label="Disponibilidade" />
              <Metric value="12" label="OS abertas" />
              <Metric value="3" label="Máquinas críticas" />
            </View>

            <Text style={styles.panelSection}>Quick actions</Text>
            <View style={styles.quickGrid}>
              <Pressable style={styles.quickCard} onPress={onStructure}>
                <View style={styles.quickIcon}><Icon name="file-tree-outline" size={21} color="#985D09" /></View>
                <Text style={styles.quickTitle}>Estrutura</Text>
                <Text style={styles.quickText}>Plantas, setores e máquinas.</Text>
              </Pressable>
              <Pressable style={styles.quickCard} onPress={onCreateOS}>
                <View style={styles.quickIcon}><Icon name="plus-circle-outline" size={21} color="#985D09" /></View>
                <Text style={styles.quickTitle}>Criar OS</Text>
                <Text style={styles.quickText}>Corretiva, preventiva ou inspeção.</Text>
              </Pressable>
              <Pressable style={styles.quickCard} onPress={onCreateAgenda}>
                <View style={[styles.quickIcon, { backgroundColor: C.blueSoft }]}>
                  <Icon name="calendar-plus" size={21} color="#5E83D7" />
                </View>
                <Text style={styles.quickTitle}>Criar agenda</Text>
                <Text style={styles.quickText}>Reservar máquina, equipe e janela.</Text>
              </Pressable>
            </View>
            <View style={styles.quickGrid}>
              <Pressable style={styles.quickCard} onPress={onPreventives}>
                <View style={[styles.quickIcon, { backgroundColor: C.greenSoft }]}><Icon name="clipboard-check-outline" size={21} color={C.green} /></View>
                <Text style={styles.quickTitle}>Preventivas</Text>
                <Text style={styles.quickText}>Planos, seções e execuções.</Text>
              </Pressable>
              <Pressable style={styles.quickCard} onPress={onDocuments}>
                <View style={[styles.quickIcon, { backgroundColor: C.blueSoft }]}><Icon name="file-document-outline" size={21} color="#5E83D7" /></View>
                <Text style={styles.quickTitle}>Documentos</Text>
                <Text style={styles.quickText}>Arquivos e evidências locais.</Text>
              </Pressable>
            </View>

            <PanelChart title="Downtime por máquina" subtitle="comparação do dia">
              <MiniBars values={[82, 54, 18, 28, 10, 14]} accent={C.accent} />
            </PanelChart>

            <PanelChart title="OS por status" subtitle="distribuição operacional">
              <Donut />
            </PanelChart>

            <PanelChart title="Desempenho semanal" subtitle="disponibilidade média">
              <MiniBars values={[46, 72, 60, 84, 66, 90, 74]} />
            </PanelChart>

            <PanelChart title="Preventivas próximas" subtitle="carga prevista por dia">
              <MiniBars values={[22, 44, 68, 40, 76, 34, 20]} accent={C.green} />
            </PanelChart>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PanelChart({ title, subtitle, children }: React.PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <View style={styles.chart}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(250,251,253,0.96)',
  },
  crumb: { fontSize: 10, letterSpacing: 1.2, color: '#89909B', fontWeight: '800' },
  title: { fontSize: 23, fontWeight: '800', letterSpacing: -0.8, color: C.ink, marginTop: 3 },
  headerActions:{flexDirection:'row',gap:8},
  iconButton: {
    width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: C.line,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4,
    backgroundColor: C.red, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  bottom: {
    position: 'absolute', left: 10, right: 10, bottom: 12, height: 70,
    flexDirection: 'row', backgroundColor: 'rgba(250,251,253,0.98)',
    borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingHorizontal: 6, paddingTop: 7,
    shadowColor: '#161B22', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: C.accentSoft },
  navIconAI: { backgroundColor: C.accent2 },
  navLabel: { fontSize: 9, color: '#9BA0A9', marginTop: 2 },
  navLabelActive: { color: C.ink, fontWeight: '700' },
  drawerHandle: {
    position: 'absolute', right: 0, top: '24%', width: 23, height: 82,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
    backgroundColor: C.accent, zIndex: 20, alignItems: 'center', justifyContent: 'center',
  },
  drawerGrip: { width: 4, height: 42, borderRadius: 2, backgroundColor: 'rgba(32,36,44,0.2)' },
  modalRoot: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,15,20,0.4)' },
  sidePanel: { width: '88%', height: '100%', backgroundColor: '#FFF', padding: 16, paddingTop: 26 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  panelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metric: { width: '48%', backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 12 },
  metricValue: { fontSize: 16, fontWeight: '800' },
  metricLabel: { fontSize: 10, color: C.muted, marginTop: 3 },
  panelSection: { fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', gap: 9 },
  quickCard: { flex: 1, minHeight: 122, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 12, backgroundColor: '#FFF' },
  quickIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickTitle: { fontSize: 12, fontWeight: '800' },
  quickText: { fontSize: 9, color: C.muted, lineHeight: 14, marginTop: 4 },
  chart: { marginTop: 12, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 12 },
  chartTitle: { fontSize: 12, fontWeight: '800' },
  chartSubtitle: { fontSize: 9, color: C.muted, marginTop: 2 },
});
