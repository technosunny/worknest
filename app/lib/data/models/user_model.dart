class UserModel {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? designation;
  final String? department;
  final String? employeeId;
  final String? avatar;

  UserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.designation,
    this.department,
    this.employeeId,
    this.avatar,
  });

  String get name => '$firstName $lastName'.trim();

  factory UserModel.fromJson(Map<String, dynamic> json) {
    String firstName = (json['first_name'] ?? json['firstName'] ?? '').toString();
    String lastName = (json['last_name'] ?? json['lastName'] ?? '').toString();

    if (firstName.isEmpty && lastName.isEmpty) {
      final fullName = (json['name'] ?? json['fullName'] ?? '').toString().trim();
      final parts = fullName.split(' ');
      firstName = parts.isNotEmpty ? parts.first : '';
      lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '';
    }

    return UserModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      firstName: firstName,
      lastName: lastName,
      email: json['email'] ?? '',
      phone: json['phone']?.toString(),
      designation: json['designation'],
      department: json['department'] is Map
          ? json['department']['name']
          : json['department'],
      employeeId: json['employeeId']?.toString() ?? json['employee_id']?.toString(),
      avatar: json['avatar'] ?? json['profilePhoto'] ?? json['photo'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'first_name': firstName,
        'last_name': lastName,
        'email': email,
        'phone': phone,
        'designation': designation,
        'department': department,
        'employeeId': employeeId,
        'avatar': avatar,
      };

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final l = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    if (f.isEmpty && l.isEmpty) return '?';
    return '$f$l';
  }
}
