import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NotificationItem } from '../types';
import { C } from '../theme';

export function NotificationsScreen({
  notifications,
  onOpen,
}: {
  notifications: NotificationItem[];
  onOpen: (item: NotificationItem) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 9 }}>
        {notifications.map(item => (
          <Pressable key={item.id} style={styles.card} onPress={() => onOpen(item)}>
            <View style={styles.icon}><Icon name="bell-outline" size={20} color="#92580A" /></View>
            <View style={{ flex: 1 }}><Text style={styles.title}>{item.title}</Text><Text style={styles.detail}>{item.detail}</Text></View>
            <Icon name="chevron-right" size={20} color="#9BA0A9" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  card: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 20, padding: 13, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12, fontWeight: '800' },
  detail: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 4 },
});
