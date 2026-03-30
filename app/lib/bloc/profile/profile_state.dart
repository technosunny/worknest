import 'package:equatable/equatable.dart';
import '../../data/models/user_model.dart';

abstract class ProfileState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final UserModel user;
  ProfileLoaded(this.user);

  @override
  List<Object?> get props => [user];
}

class ProfileError extends ProfileState {
  final String message;
  ProfileError(this.message);

  @override
  List<Object?> get props => [message];
}

class ProfileActionLoading extends ProfileState {}

class ProfileUpdateSuccess extends ProfileState {
  final UserModel user;
  ProfileUpdateSuccess(this.user);

  @override
  List<Object?> get props => [user];
}

class ProfilePasswordChanged extends ProfileState {}

class ProfileActionError extends ProfileState {
  final String message;
  ProfileActionError(this.message);

  @override
  List<Object?> get props => [message];
}
