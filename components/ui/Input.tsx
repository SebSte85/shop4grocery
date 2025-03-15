import { View, Text, TextInput, TextInputProps } from "react-native";
import { styled } from "nativewind";

const StyledTextInput = styled(TextInput);

interface InputProps extends TextInputProps {
  error?: string;
}

export function Input({ error, ...props }: InputProps) {
  return (
    <View className="w-full">
      <StyledTextInput
        className={`w-full px-4 py-3 rounded-lg bg-black-2 text-white font-rubik
          ${error ? "border border-attention" : "border border-transparent"}`}
        placeholderTextColor="#8C8E98"
        {...props}
      />
      {error && (
        <Text className="text-attention text-sm mt-1 font-rubik">{error}</Text>
      )}
    </View>
  );
}
