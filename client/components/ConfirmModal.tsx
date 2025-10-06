import React from "react";
import { Modal, View, Text, Button } from "react-native";
import { confirmModalStyles } from "@/styles/styles";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={confirmModalStyles.centeredView}>
        <View style={confirmModalStyles.modalView}>
          <Text style={confirmModalStyles.modalTitle}>{title}</Text>
          <Text style={confirmModalStyles.modalText}>{message}</Text>
          <View style={confirmModalStyles.buttonRow}>
            <Button title="Batal" onPress={onCancel} color="#888" />
            <Button title="Hapus" onPress={onConfirm} color="red" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
