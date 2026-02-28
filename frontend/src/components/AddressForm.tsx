import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

const COLORS = {
  primary: '#EA580C',
  primaryLight: '#FFF7ED',
  background: '#FDFBF7',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  inputBg: '#F9FAFB',
};

// Canadian Provinces and Territories
const CANADIAN_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
];

interface AddressData {
  streetAddress: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
}

interface AddressFormProps {
  onAddressChange: (address: AddressData, fullAddress: string) => void;
  initialAddress?: AddressData;
}

interface AddressSuggestion {
  place_id: string;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    county?: string;
    suburb?: string;
  };
}

export default function AddressForm({ onAddressChange, initialAddress }: AddressFormProps) {
  const [streetAddress, setStreetAddress] = useState(initialAddress?.streetAddress || '');
  const [apartment, setApartment] = useState(initialAddress?.apartment || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [state, setState] = useState(initialAddress?.state || '');
  const [postalCode, setPostalCode] = useState(initialAddress?.postalCode || '');
  
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Update parent when any field changes
  useEffect(() => {
    const addressData: AddressData = {
      streetAddress,
      apartment,
      city,
      state,
      postalCode,
    };
    
    const fullAddress = [
      streetAddress,
      apartment,
      city,
      state,
      postalCode,
    ].filter(Boolean).join(', ');
    
    onAddressChange(addressData, fullAddress);
  }, [streetAddress, apartment, city, state, postalCode]);

  // Debounced search function using Nominatim API
  const searchAddress = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'TheDabba/1.0',
            },
          }
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (error) {
        console.error('Address search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (streetAddress && focusedField === 'street') {
      searchAddress(streetAddress);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [streetAddress, focusedField, searchAddress]);

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    const addr = item.address;
    
    // Build street address
    const street = [addr.house_number, addr.road].filter(Boolean).join(' ') || item.display_name.split(',')[0];
    setStreetAddress(street);
    
    // Set city
    const cityValue = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
    setCity(cityValue);
    
    // Set state
    if (addr.state) {
      setState(addr.state);
    }
    
    // Set postal code
    if (addr.postcode) {
      setPostalCode(addr.postcode);
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const renderFloatingLabel = (label: string, value: string, isFocused: boolean) => {
    const isActive = isFocused || value.length > 0;
    return (
      <Text style={[
        styles.floatingLabel,
        isActive && styles.floatingLabelActive,
      ]}>
        {label}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Street Address */}
      <View style={styles.inputGroup}>
        <View style={[
          styles.inputContainer,
          focusedField === 'street' && styles.inputContainerFocused,
        ]}>
          {renderFloatingLabel('Street address', streetAddress, focusedField === 'street')}
          <TextInput
            style={styles.input}
            value={streetAddress}
            onChangeText={setStreetAddress}
            onFocus={() => setFocusedField('street')}
            onBlur={() => setFocusedField(null)}
            placeholder=""
          />
          {streetAddress.length > 0 && (
            <TouchableOpacity onPress={() => setStreetAddress('')} style={styles.clearButton}>
              <Ionicons name="close" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
          {isLoading && focusedField === 'street' && (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
          )}
        </View>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id.toString()}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Ionicons name="location" size={18} color={COLORS.primary} />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Apartment/Suite */}
      <View style={styles.inputGroup}>
        <View style={[
          styles.inputContainer,
          focusedField === 'apartment' && styles.inputContainerFocused,
        ]}>
          {renderFloatingLabel('Apt, suite, etc. (optional)', apartment, focusedField === 'apartment')}
          <TextInput
            style={styles.input}
            value={apartment}
            onChangeText={setApartment}
            onFocus={() => setFocusedField('apartment')}
            onBlur={() => setFocusedField(null)}
            placeholder=""
          />
        </View>
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <View style={[
          styles.inputContainer,
          focusedField === 'city' && styles.inputContainerFocused,
        ]}>
          {renderFloatingLabel('City', city, focusedField === 'city')}
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            onFocus={() => setFocusedField('city')}
            onBlur={() => setFocusedField(null)}
            placeholder=""
          />
        </View>
      </View>

      {/* State and Postal Code Row */}
      <View style={styles.rowContainer}>
        {/* Province/State Dropdown */}
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <TouchableOpacity
            style={[
              styles.inputContainer,
              styles.dropdownContainer,
            ]}
            onPress={() => setShowStateModal(true)}
          >
            {renderFloatingLabel('Province', state, true)}
            <Text style={[styles.dropdownText, !state && styles.dropdownPlaceholder]}>
              {state || 'Select'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Postal Code */}
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <View style={[
            styles.inputContainer,
            focusedField === 'postal' && styles.inputContainerFocused,
          ]}>
            {renderFloatingLabel('Postal code', postalCode, focusedField === 'postal')}
            <TextInput
              style={styles.input}
              value={postalCode}
              onChangeText={setPostalCode}
              onFocus={() => setFocusedField('postal')}
              onBlur={() => setFocusedField(null)}
              placeholder=""
              keyboardType="default"
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>

      {/* Province Selection Modal */}
      <Modal visible={showStateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Province</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.stateList}>
              {CANADIAN_PROVINCES.map((stateName) => (
                <TouchableOpacity
                  key={stateName}
                  style={[
                    styles.stateItem,
                    state === stateName && styles.stateItemSelected,
                  ]}
                  onPress={() => {
                    setState(stateName);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[
                    styles.stateItemText,
                    state === stateName && styles.stateItemTextSelected,
                  ]}>
                    {stateName}
                  </Text>
                  {state === stateName && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  inputGroupWithSuggestions: {
    zIndex: 9999,
  },
  inputContainer: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: 16,
    fontSize: 16,
    color: COLORS.textLight,
    backgroundColor: 'transparent',
  },
  floatingLabelActive: {
    top: 6,
    fontSize: 12,
    color: COLORS.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 4,
    marginTop: 4,
  },
  clearButton: {
    padding: 4,
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    maxHeight: 200,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 999,
    zIndex: 9999,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dropdownContainer: {
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginTop: 4,
  },
  dropdownPlaceholder: {
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  stateList: {
    padding: 8,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
  },
  stateItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  stateItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  stateItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
