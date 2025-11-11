import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import {
  InventoryApi,
  CardCondition,
  CardLanguage,
  InventoryVisibility,
  CreateInventoryPayload,
  CardSearchFilters,
  CardSearchResultItem,
} from '../api/inventory';
import type { InventoryStackParamList } from '../navigation/types';

const conditions: CardCondition[] = ['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR'];
const languages: CardLanguage[] = ['EN', 'PT', 'ES', 'FR', 'DE', 'IT', 'JA', 'KO', 'ZH', 'OTHER'];
const visibilities: InventoryVisibility[] = ['PESSOAL', 'EVENTO', 'PUBLICO'];
const SUPERTYPES = ['Pokémon', 'Trainer', 'Energy'];
const RARITY_OPTIONS = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Ultra Rare', 'Secret Rare'];
const SERIES_OPTIONS = ['Scarlet & Violet', 'Sword & Shield', 'Sun & Moon', 'XY', 'Black & White', 'EX', 'Gym', 'Base'];
const SUBTYPE_OPTIONS = ['Full Art', 'Ultra Beast', 'Poké Ball', 'TAG TEAM', 'VMAX', 'VSTAR', 'Radiant', 'Item', 'Supporter'];
const PAGE_SIZE = 20;
const CARD_SUMMARY_FIELDS = [
  'id',
  'name',
  'number',
  'rarity',
  'supertype',
  'subtypes',
  'set.name',
  'set.series',
  'images.small',
  'images.large',
  'tcgplayer.productId',
  'cardmarket.id',
];

type Props = NativeStackScreenProps<InventoryStackParamList, 'AddCard'>;

const AddCardScreen: React.FC<Props> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const [cardDefinitionId, setCardDefinitionId] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardSearchResultItem | null>(null);
  const [condition, setCondition] = useState<CardCondition>('NEAR_MINT');
  const [language, setLanguage] = useState<CardLanguage>('EN');
  const [quantity, setQuantity] = useState('1');
  const [visibility, setVisibility] = useState<InventoryVisibility>('PESSOAL');
  const [precoVendaDesejado, setPrecoVendaDesejado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CardSearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{ label: string; cardDefinitionId?: string; confidence?: number }>>([]);
  const [scanning, setScanning] = useState(false);
  const [supertype, setSupertype] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);
  const [setNameFilter, setSetNameFilter] = useState('');
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<CardSearchFilters | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const baseFilters = useMemo<CardSearchFilters>(
    () => ({
      name: searchTerm.trim() || undefined,
      supertype: supertype || undefined,
      rarity: rarityFilter || undefined,
      setSeries: seriesFilter || undefined,
      setName: setNameFilter.trim() || undefined,
      subtypes: selectedSubtypes,
      pageSize: PAGE_SIZE,
      select: CARD_SUMMARY_FIELDS,
    }),
    [searchTerm, supertype, rarityFilter, seriesFilter, setNameFilter, selectedSubtypes],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (supertype) count += 1;
    if (rarityFilter) count += 1;
    if (seriesFilter) count += 1;
    if (setNameFilter.trim()) count += 1;
    if (selectedSubtypes.length > 0) count += 1;
    return count;
  }, [supertype, rarityFilter, seriesFilter, setNameFilter, selectedSubtypes]);

  const REQUIRED_FILTERS = 0;

  const canSearch = useMemo(() => {
    const nameValid = (baseFilters.name?.length ?? 0) >= 3;
    return nameValid || activeFilterCount > 0;
  }, [baseFilters.name, activeFilterCount]);

  const createItem = useMutation({
    mutationFn: (payload: CreateInventoryPayload) => InventoryApi.createInventoryItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'me'] });
      Alert.alert('Carta adicionada', 'O item foi adicionado ao inventário.');
      navigation.goBack();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível adicionar o item';
      Alert.alert('Erro', message);
    },
  });

  const handleSubmit = () => {
    if (!cardDefinitionId.trim()) {
      Alert.alert('Dados em falta', 'Selecione uma carta através da busca ou do scan.');
      return;
    }

    const qty = Number.parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      Alert.alert('Quantidade inválida', 'A quantidade deve ser um número inteiro positivo.');
      return;
    }

    const payload: CreateInventoryPayload = {
      cardDefinitionId: cardDefinitionId.trim(),
      condition,
      language,
      quantity: qty,
      visibility,
    };

    if (precoVendaDesejado.trim()) {
      const price = Number.parseFloat(precoVendaDesejado);
      if (Number.isNaN(price) || price < 0) {
        Alert.alert('Preço inválido', 'Informe um preço numérico válido.');
        return;
      }
      payload.precoVendaDesejado = price;
    }

    createItem.mutate(payload);
  };

  const handleSelectCard = (card: CardSearchResultItem) => {
    setCardDefinitionId(card.id);
    setSelectedCard(card);
  };

  const executeSearch = async (pageOverride: number, append: boolean) => {
    const payload: CardSearchFilters = { ...baseFilters, page: pageOverride };

    if (!append) {
      setHasSearched(true);
    }

    if (!append) {
      setSearching(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await InventoryApi.searchCards(payload);
      const { data: incoming, page, pageSize, totalCount } = response;
      setSearchError(null);
      setCurrentFilters(payload);
      setCurrentPage(page);
      setHasMore(page * pageSize < totalCount);
      setSearchResults((prev) => {
        if (append) {
          const merged = [...prev];
          incoming.forEach((card) => {
            if (!merged.some((existing) => existing.id === card.id)) {
              merged.push(card);
            }
          });
          return merged;
        }
        return incoming;
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const serverMessage =
          typeof error.response?.data === 'string'
            ? error.response.data
            : error.response?.data?.message ?? error.message;
        setSearchError(serverMessage);
      } else {
        const message = error instanceof Error ? error.message : 'Não foi possível buscar cartas';
        setSearchError(message);
      }
      if (!append) {
        setSearchResults([]);
      }
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    if (!canSearch) {
      Alert.alert('Busca incompleta', 'Digite ao menos três letras do nome ou selecione algum filtro.');
      return;
    }
    executeSearch(1, false);
  };

  const handleLoadMore = () => {
    if (!currentFilters || loadingMore || !hasMore) {
      return;
    }
    executeSearch(currentPage + 1, true);
  };

  const toggleSubtype = (tag: string) => {
    setSelectedSubtypes((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleScanImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length || !result.assets[0].base64) {
      return;
    }

    setScanning(true);
    try {
      const predictions = await InventoryApi.scanInventory(result.assets[0].base64);
      setScanResults(predictions ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível analisar a imagem';
      Alert.alert('Erro no scan', message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.label}>Pesquisar carta</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Nome da carta"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <Text style={styles.helperText}>
            Digite pelo menos 3 letras. Os filtros são opcionais, mas ajudam a refinar a busca. ({activeFilterCount} filtro(s) ativo(s))
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tipo principal</Text>
          <View style={styles.pillRow}>
            {SUPERTYPES.map((type) => {
              const selected = supertype === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setSupertype(selected ? null : type)}
                >
                  <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Raridade</Text>
          <View style={styles.pillRow}>
            {RARITY_OPTIONS.map((option) => {
              const selected = rarityFilter === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setRarityFilter(selected ? null : option)}
                >
                  <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Série / Set</Text>
          <View style={styles.pillRow}>
            {SERIES_OPTIONS.map((option) => {
              const selected = seriesFilter === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setSeriesFilter(selected ? null : option)}
                >
                  <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={[styles.input, styles.topSpacing]}
            placeholder="Nome do set/coleção (opcional)"
            value={setNameFilter}
            onChangeText={setSetNameFilter}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tratamentos / Subtipos</Text>
          <View style={styles.pillRow}>
            {SUBTYPE_OPTIONS.map((option) => {
              const selected = selectedSubtypes.includes(option);
              return (
                <Pressable
                  key={option}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => toggleSubtype(option)}
                >
                  <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={[styles.searchButton, (!canSearch || searching) && styles.actionButtonDisabled]}
            onPress={handleSearch}
            disabled={!canSearch || searching}
          >
            <Text style={styles.searchLabel}>{searching ? 'Buscando...' : 'Buscar cartas'}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Resultados</Text>
          {searchResults.length > 0 ? (
            <View style={styles.resultsBox}>
              {searchResults.map((item) => (
                <Pressable key={item.id} style={styles.resultItem} onPress={() => handleSelectCard(item)}>
                  <View style={styles.resultContent}>
                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.resultImage} /> : null}
                    <View style={styles.resultText}>
                      <Text style={styles.resultTitle}>{item.name}</Text>
                      {item.setName ? <Text style={styles.resultSubtitle}>{item.setName}</Text> : null}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : !hasSearched || searching ? null : (
            <Text style={styles.helperText}>Nenhuma carta encontrada para os filtros fornecidos.</Text>
          )}
          {searchError ? <Text style={styles.errorTextSmall}>{searchError}</Text> : null}
          {hasMore ? (
            <Pressable
              style={[styles.loadMoreButton, loadingMore && styles.actionButtonDisabled]}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              <Text style={styles.loadMoreLabel}>{loadingMore ? 'Carregando...' : 'Carregar mais'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Scan por imagem</Text>
          <Pressable style={styles.scanButton} onPress={handleScanImage} disabled={scanning}>
            <Text style={styles.scanLabel}>{scanning ? 'Analisando...' : 'Escolher imagem'}</Text>
          </Pressable>
          {scanResults.length > 0 && (
            <View style={styles.resultsBox}>
              {scanResults.map((result, index) => (
                <Pressable
                  key={`${result.label}-${index}`}
                  style={styles.resultItem}
                  onPress={() =>
                    result.cardDefinitionId &&
                    handleSelectCard({ id: result.cardDefinitionId, name: result.label ?? 'Carta identificada' })
                  }
                >
                  <Text style={styles.resultTitle}>{result.label}</Text>
                  {typeof result.confidence === 'number' ? (
                    <Text style={styles.resultSubtitle}>{Math.round(result.confidence * 100)}%</Text>
                  ) : null}
                  {!result.cardDefinitionId && (
                    <Text style={styles.resultSubtitle}>Selecione manualmente na busca</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {selectedCard && (
          <View style={styles.section}>
            <Text style={styles.label}>Carta selecionada</Text>
            <Text style={styles.selectedText}>
              {selectedCard.name}
              {selectedCard.setName ? ` • ${selectedCard.setName}` : ''}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Condição</Text>
        <View style={styles.pillRow}>
          {conditions.map((item) => {
            const selected = item === condition;
            return (
              <Pressable key={item} style={[styles.pill, selected && styles.pillSelected]} onPress={() => setCondition(item)}>
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Idioma</Text>
        <View style={styles.pillRow}>
          {languages.map((item) => {
            const selected = item === language;
            return (
              <Pressable key={item} style={[styles.pill, selected && styles.pillSelected]} onPress={() => setLanguage(item)}>
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Quantidade</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />

        <Text style={styles.label}>Visibilidade</Text>
        <View style={styles.pillRow}>
          {visibilities.map((item) => {
            const selected = item === visibility;
            return (
              <Pressable key={item} style={[styles.pill, selected && styles.pillSelected]} onPress={() => setVisibility(item)}>
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Preço desejado (opcional)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={precoVendaDesejado}
          onChangeText={setPrecoVendaDesejado}
        />

        <View style={styles.submitRow}>
          <Pressable
            style={[styles.submitButton, createItem.isPending && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={createItem.isPending}
          >
            <Text style={styles.submitLabel}>{createItem.isPending ? 'A guardar...' : 'Adicionar'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1f2937',
  },
  selectedText: {
    fontWeight: '600',
    color: '#2563eb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  flex: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  scanLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultsBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultImage: {
    width: 52,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  resultText: {
    flexShrink: 1,
  },
  resultTitle: {
    fontWeight: '600',
  },
  resultSubtitle: {
    color: '#6b7280',
  },
  loadMoreButton: {
    marginTop: 12,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  loadMoreLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillLabel: {
    color: '#4b5563',
    fontWeight: '500',
  },
  pillSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillLabelSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  submitRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    borderRadius: 999,
  },
  submitLabel: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    color: '#6b7280',
    marginTop: 8,
  },
  errorTextSmall: {
    color: '#b91c1c',
    marginTop: 8,
  },
  topSpacing: {
    marginTop: 12,
  },
  submitDisabled: {
    opacity: 0.6,
  },
});

export default AddCardScreen;
