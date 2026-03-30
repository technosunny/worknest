import 'package:equatable/equatable.dart';

abstract class ProfileEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class ProfileLoadRequested extends ProfileEvent {}

class ProfileUpdateRequested extends ProfileEvent {
  final String firstName;
  final String lastName;
  final String? phone;

  ProfileUpdateRequested({
    required this.firstName,
    required this.lastName,
    this.phone,
  });

  @override
  List<Object?> get props => [firstName, lastName, phone];
}

class ProfileChangePasswordRequested extends ProfileEvent {
  final String currentPassword;
  final String newPassword;

  ProfileChangePasswordRequested({
    required this.currentPassword,
    required this.newPassword,
  });

  @override
  List<Object?> get props => [currentPassword, newPassword];
}
