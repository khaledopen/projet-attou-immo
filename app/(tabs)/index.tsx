import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatCard = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statInfo}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
  </View>
);

export default function OwnerDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Tableau de bord</Text>
          <Text style={styles.title}>Propriétaire</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsGrid}>
          <StatCard title="Mes Biens" value="12" icon="home" color="#065f46" />
          <StatCard title="Visites" value="08" icon="calendar" color="#d97706" />
          <StatCard title="Messages" value="24" icon="chatbubbles" color="#2563eb" />
          <StatCard title="Revenus" value="4.2M" icon="cash" color="#7c3aed" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Demandes de visite</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {[1, 2, 3].map(i => (
            <View key={i} style={styles.visitItem}>
              <View style={styles.visitLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{String.fromCharCode(64 + i)}</Text>
                </View>
                <View>
                  <Text style={styles.visitorName}>Visiteur {i}</Text>
                  <Text style={styles.propertyName}>Appartement Riviera {i}</Text>
                </View>
              </View>
              <View style={styles.visitRight}>
                <TouchableOpacity style={styles.acceptBtn}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn}>
                  <Ionicons name="close" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance mensuelle</Text>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="stats-chart" size={40} color="#e2e8f0" />
            <Text style={styles.chartText}>Graphique de performance</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  addBtn: {
    backgroundColor: '#065f46',
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#065f46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  statIconContainer: {
    padding: 8,
    borderRadius: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  seeAll: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
  },
  visitItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  visitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
  },
  visitorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  propertyName: {
    fontSize: 12,
    color: '#64748b',
  },
  visitRight: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#065f46',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#fef2f2',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  chartText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
  },
});
