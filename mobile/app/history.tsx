import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { useDecodeHistory } from "../hooks/useDecodeHistory";
import { DecodeHistoryEntry } from "../types";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function HistoryItem({
  entry,
  onPress,
  expanded,
}: {
  entry: DecodeHistoryEntry;
  onPress: () => void;
  expanded: boolean;
}) {
  const getStatusBadge = () => {
    if (entry.feedback_status === "confirmed") {
      return <Text style={styles.statusBadgeConfirmed}>✓</Text>;
    }
    if (entry.feedback_status === "corrected") {
      return <Text style={styles.statusBadgeCorrected}>✎</Text>;
    }
    return <Text style={styles.statusBadgePending}>⋯</Text>;
  };

  return (
    <Pressable
      style={styles.itemContainer}
      onPress={onPress}
      accessibilityLabel={`Decode: ${entry.decoded_text}. Status: ${entry.feedback_status}. Tap to expand`}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <Text style={styles.decodedText} numberOfLines={2}>
            {entry.decoded_text}
          </Text>
          <View style={styles.itemMetadata}>
            <Text style={styles.timestamp}>
              {formatRelativeTime(entry.created_at)}
            </Text>
            <View style={styles.modalityIcons}>
              <Text style={styles.modalityIcon}>🔊</Text>
              {entry.lip_used && <Text style={styles.modalityIcon}>👄</Text>}
            </View>
          </View>
        </View>
        <View style={styles.statusBadgeContainer}>{getStatusBadge()}</View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Raw Whisper:</Text>
            <Text style={styles.detailValue}>{entry.raw_whisper}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Confidence:</Text>
            <Text style={styles.detailValue}>
              {(entry.whisper_confidence * 100).toFixed(0)}%
            </Text>
          </View>
          {entry.feedback_status === "corrected" && entry.corrected_text && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Corrected to:</Text>
              <Text style={[styles.detailValue, styles.correctedText]}>
                {entry.corrected_text}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.user_id || "";
  const { history, isLoading, refresh, stats } = useDecodeHistory(userId);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (decodeId: string) => {
    setExpandedId(expandedId === decodeId ? null : decodeId);
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      </SafeAreaView>
    );
  }

  const accuracyRate =
    stats.totalDecodes > 0
      ? ((stats.confirmedCount / stats.totalDecodes) * 100).toFixed(0)
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your Speech History</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.decode_id}
        renderItem={({ item }) => (
          <HistoryItem
            entry={item}
            onPress={() => toggleExpand(item.decode_id)}
            expanded={expandedId === item.decode_id}
          />
        )}
        ListHeaderComponent={
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalDecodes}</Text>
                <Text style={styles.statLabel}>Total Decodes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{accuracyRate}%</Text>
                <Text style={styles.statLabel}>Accuracy Rate</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.confirmedCount}</Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.correctedCount}</Text>
                <Text style={styles.statLabel}>Corrected</Text>
              </View>
            </View>
            {stats.accuracyTrend.length > 0 && (
              <View style={styles.trendRow}>
                <Text style={styles.trendLabel}>Recent accuracy trend:</Text>
                <Text style={styles.trendValue}>
                  {stats.accuracyTrend.map((val) => `${val}%`).join(", ")}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No decode history yet</Text>
            <Text style={styles.emptySubtext}>
              Start using the app to build your history
            </Text>
          </View>
        }
        onRefresh={refresh}
        refreshing={isLoading}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 28,
    color: "#4A90D9",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333333",
    marginLeft: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  statsCard: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4A90D9",
  },
  statLabel: {
    fontSize: 16,
    color: "#666666",
    marginTop: 4,
  },
  trendRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  trendLabel: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 16,
    color: "#333333",
  },
  itemContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    minHeight: 48,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  decodedText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  itemMetadata: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timestamp: {
    fontSize: 14,
    color: "#999999",
  },
  modalityIcons: {
    flexDirection: "row",
  },
  modalityIcon: {
    fontSize: 16,
    marginLeft: 4,
  },
  statusBadgeContainer: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
  },
  statusBadgeConfirmed: {
    fontSize: 28,
    color: "#28A745",
  },
  statusBadgeCorrected: {
    fontSize: 28,
    color: "#4A90D9",
  },
  statusBadgePending: {
    fontSize: 28,
    color: "#999999",
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 18,
    color: "#333333",
  },
  correctedText: {
    color: "#4A90D9",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 18,
    color: "#999999",
    textAlign: "center",
  },
});
