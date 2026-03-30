class UserModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? designation;
  final String? department;
  final String? employeeId;
  final String? avatar;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.designation,
    this.department,
    this.employeeId,
    this.avatar,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] ?? json['fullName'] ?? '',
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
        'name': name,
        'email': email,
        'phone': phone,
        'designation': designation,
        'department': department,
        'employeeId': employeeId,
        'avatar': avatar,
      };

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }
}
