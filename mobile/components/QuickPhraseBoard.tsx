import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII } from "../utils/theme";
import { DEFAULT_PHRASES } from "../utils/constants";
import PhraseChip from "./PhraseChip";
import type { QuickPhrase, PhraseCategory } from "../types";

interface QuickPhraseBoardProps {
  onPhraseSelect: (text: string) => void;
  recentPhrases: string[];
  savedPhrases: QuickPhrase[];
  onToggleFavorite: (phraseId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  recent: "Recent",
  favorites: "Favorites",
  essentials: "Essentials",
  greetings: "Greetings",
  needs: "Needs",
  responses: "Responses",
  emergency: "Emergency",
};

export default function QuickPhraseBoard({
  onPhraseSelect,
  recentPhrases,
  savedPhrases,
  onToggleFavorite,
}: QuickPhraseBoardProps) {
  const [activeTab, setActiveTab] = useState<string>("essentials");
  const [collapsed, setCollapsed] = useState(false);

  const favoriteIds = new Set(
    savedPhrases.filter((p) => p.isFavorite).map((p) => p.text)
  );

  const tabs: string[] = [];
  if (recentPhrases.length > 0) tabs.push("recent");
  if (savedPhrases.some((p) => p.isFavorite)) tabs.push("favorites");
  tabs.push("essentials", "greetings", "needs", "responses", "emergency");

  const getPhrasesForTab = (): string[] => {
    if (activeTab === "recent") return recentPhrases;
    if (activeTab === "favorites") {
      return savedPhrases.filter((p) => p.isFavorite).map((p) => p.text);
    }
    return DEFAULT_PHRASES[activeTab] || [];
  };

  const phrases = getPhrasesForTab();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setCollapsed(!collapsed)}
        style={styles.collapseToggle}
        accessibilityLabel={collapsed ? "Expand phrase board" : "Collapse phrase board"}
        accessibilityRole="button"
      >
        <Text style={styles.collapseLabel}>Quick Phrases</Text>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={COLORS.textSecondary}
        />
      </Pressable>

      {!collapsed && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  activeTab === tab && styles.tabActive,
                ]}
                accessibilityLabel={`${CATEGORY_LABELS[tab]} category`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {CATEGORY_LABELS[tab]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.phraseArea}
            contentContainerStyle={styles.phraseGrid}
            showsVerticalScrollIndicator={false}
          >
            {phrases.map((text, index) => (
              <PhraseChip
                key={`${activeTab}-${index}`}
                text={text}
                onPress={() => onPhraseSelect(text)}
                onLongPress={() => {
                  const existing = savedPhrases.find((p) => p.text === text);
                  if (existing) onToggleFavorite(existing.id);
                }}
                isFavorite={favoriteIds.has(text)}
              />
            ))}
            {phrases.length === 0 && (
              <Text style={styles.emptyText}>
                {activeTab === "recent"
                  ? "No recent phrases yet"
                  : "No favorites saved yet"}
              </Text>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  collapseToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  collapseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabBar: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.buttonText,
  },
  phraseArea: {
    maxHeight: 140,
  },
  phraseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: 16,
    width: "100%",
  },
});
