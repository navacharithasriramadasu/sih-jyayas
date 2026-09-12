# 📱 Frontend OTP Integration Guide (React Native / Expo)

This guide explains how to implement the newly refactored **Twilio Verify OTP Flow** on your frontend. The backend now uses Twilio Verify as the single source of truth, meaning no OTPs are stored in the database.

## 🔄 The Authentication Flow

The flow consists of two screens:
1. **Phone Input Screen** (User enters their number)
2. **OTP Verification Screen** (User enters the 6-digit code received via SMS)

---

### Step 1: Requesting the OTP (`/api/v1/auth/send-otp`)

When the user submits their phone number, you must send a `POST` request to the backend.

**API Contract:**
```http
POST https://agriconnect-api-fiz5.onrender.com/api/v1/auth/send-otp
Content-Type: application/json

{
  "phone_number": "+919876543210",
  "role": "farmer" // or "bulk_buyer", "fpo"
}
```

**Frontend React Native Implementation:**
```typescript
import { useState } from 'react';
import { Alert, Button, TextInput, View, ActivityIndicator } from 'react-native';
import axios from 'axios';

export const PhoneInputScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false); // REQUIREMENT #4: Prevent Double Clicks

  const handleSendOtp = async () => {
    if (!phoneNumber) return Alert.alert('Error', 'Please enter a valid phone number');
    
    // Disable button to prevent duplicate Twilio requests
    setIsLoading(true); 
    
    try {
      const response = await axios.post('https://agriconnect-api-fiz5.onrender.com/api/v1/auth/send-otp', {
        phone_number: `+91${phoneNumber}`, // Ensure E.164 format
        role: 'farmer'
      });

      // Navigate to OTP screen and pass the session_id (even though it's dummy now) and phone
      navigation.navigate('VerifyOtpScreen', { 
        phone_number: `+91${phoneNumber}`,
        session_id: response.data.session_id 
      });

    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false); // Re-enable button
    }
  };

  return (
    <View>
      <TextInput 
        placeholder="Enter Mobile Number" 
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        editable={!isLoading}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Send OTP" onPress={handleSendOtp} />
      )}
    </View>
  );
};
```

---

### Step 2: Verifying the OTP (`/api/v1/auth/verify-otp`)

Once the user receives the SMS from Twilio, they enter the 6-digit code.

**API Contract:**
```http
POST https://agriconnect-api-fiz5.onrender.com/api/v1/auth/verify-otp
Content-Type: application/json

{
  "session_id": "twilio-verify", // Passed from the previous screen
  "phone_number": "+919876543210",
  "otp": "482913"
}
```

**Frontend React Native Implementation:**
```typescript
import { useState } from 'react';
import { Alert, Button, TextInput, View, ActivityIndicator } from 'react-native';
import axios from 'axios';
// import { useAuthStore } from '../store/authStore'; // Example state management

export const VerifyOtpScreen = ({ route, navigation }) => {
  const { phone_number, session_id } = route.params;
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return Alert.alert('Error', 'OTP must be 6 digits');

    setIsVerifying(true);
    
    try {
      const response = await axios.post('https://agriconnect-api-fiz5.onrender.com/api/v1/auth/verify-otp', {
        session_id,
        phone_number,
        otp
      });

      // Twilio approved the OTP! 
      const { access_token, user } = response.data;
      
      // 1. Save Token to SecureStore / AsyncStorage
      // 2. Update global Auth State (Redux/Zustand/Context)
      // 3. Navigate to Main App Dashboard
      
      Alert.alert('Success', 'Welcome to AgriConnect!');
      // navigation.replace('Dashboard');

    } catch (error) {
      // If Twilio says the OTP is wrong, or it expired (10 mins max)
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View>
      <TextInput 
        placeholder="Enter 6-digit OTP" 
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        editable={!isVerifying}
      />
      {isVerifying ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <Button title="Verify & Login" onPress={handleVerifyOtp} />
      )}
    </View>
  );
};
```

### 🚨 Critical UI/UX Rules Implemented:
1. **Disabled Buttons:** The `isLoading` state explicitly disables inputs and hides the button while the API request is pending. This prevents the user from double-clicking and spamming Twilio's API, which would cause an error.
2. **Absolute URLs:** Ensure Axios uses the absolute URL (`https://agriconnect-api-fiz5.onrender.com/...`) instead of relative paths (`/api/...`) since this is a mobile app.
3. **E.164 Formatting:** Notice the `` `+91${phoneNumber}` `` formatting. Twilio strictly requires the `+` and country code.
