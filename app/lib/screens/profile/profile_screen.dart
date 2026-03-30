import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../../bloc/profile/profile_bloc.dart';
import '../../bloc/profile/profile_event.dart';
import '../../bloc/profile/profile_state.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/user_model.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    context.read<ProfileBloc>().add(ProfileLoadRequested());
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(AuthLogoutRequested());
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  void _showEditProfile(UserModel user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BlocProvider.value(
        value: context.read<ProfileBloc>(),
        child: _EditProfileSheet(user: user),
      ),
    );
  }

  void _showChangePassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BlocProvider.value(
        value: context.read<ProfileBloc>(),
        child: const _ChangePasswordSheet(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppTheme.border),
        ),
      ),
      body: BlocConsumer<ProfileBloc, ProfileState>(
        listener: (context, state) {
          if (state is ProfileUpdateSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Profile updated successfully'),
                backgroundColor: AppTheme.success,
              ),
            );
          } else if (state is ProfilePasswordChanged) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Password changed successfully'),
                backgroundColor: AppTheme.success,
              ),
            );
          } else if (state is ProfileActionError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            );
          }

          UserModel? user;
          if (state is ProfileLoaded) {
            user = state.user;
          } else if (state is ProfileUpdateSuccess) {
            user = state.user;
          } else if (state is ProfileActionLoading ||
              state is ProfileActionError ||
              state is ProfilePasswordChanged) {
            // Keep showing last known user during action states
            final authState = context.read<AuthBloc>().state;
            if (authState is AuthAuthenticated) user = authState.user;
          } else {
            final authState = context.read<AuthBloc>().state;
            if (authState is AuthAuthenticated) user = authState.user;
          }

          if (user == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Failed to load profile'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () =>
                        context.read<ProfileBloc>().add(ProfileLoadRequested()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return _buildProfile(user);
        },
      ),
    );
  }

  Widget _buildProfile(UserModel user) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildAvatarSection(user),
        const SizedBox(height: 24),
        _buildInfoSection(user),
        const SizedBox(height: 16),
        _buildEditSection(user),
        const SizedBox(height: 100),
      ],
    );
  }

  Widget _buildAvatarSection(UserModel user) {
    return Center(
      child: Column(
        children: [
          CircleAvatar(
            radius: 48,
            backgroundColor: AppTheme.primaryLight,
            backgroundImage: user.avatar != null && user.avatar!.isNotEmpty
                ? NetworkImage(user.avatar!)
                : null,
            child: (user.avatar == null || user.avatar!.isEmpty)
                ? Text(
                    user.initials,
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  )
                : null,
          ),
          const SizedBox(height: 16),
          Text(
            user.name,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          if (user.designation != null) ...[
            const SizedBox(height: 4),
            Text(
              user.designation!,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
          if (user.department != null) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                user.department!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.primary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoSection(UserModel user) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          _InfoTile(
            icon: Icons.badge_outlined,
            label: 'Employee ID',
            value: user.employeeId ?? 'N/A',
          ),
          const Divider(height: 1),
          _InfoTile(
            icon: Icons.email_outlined,
            label: 'Email',
            value: user.email,
          ),
          if (user.phone != null) ...[
            const Divider(height: 1),
            _InfoTile(
              icon: Icons.phone_outlined,
              label: 'Phone',
              value: user.phone!,
            ),
          ],
          if (user.designation != null) ...[
            const Divider(height: 1),
            _InfoTile(
              icon: Icons.work_outline_rounded,
              label: 'Designation',
              value: user.designation!,
            ),
          ],
          if (user.department != null) ...[
            const Divider(height: 1),
            _InfoTile(
              icon: Icons.business_outlined,
              label: 'Department',
              value: user.department!,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEditSection(UserModel user) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          ListTile(
            leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.primary),
            ),
            title: const Text(
              'Edit Profile',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.textPrimary,
              ),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppTheme.textLight),
            onTap: () => _showEditProfile(user),
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.lock_outline_rounded, size: 18, color: AppTheme.primary),
            ),
            title: const Text(
              'Change Password',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.textPrimary,
              ),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppTheme.textLight),
            onTap: _showChangePassword,
          ),
          const Divider(height: 1),
          ListTile(
            leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.errorLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.logout_rounded, size: 18, color: AppTheme.error),
            ),
            title: const Text(
              'Sign Out',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.error,
              ),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppTheme.textLight),
            onTap: _logout,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textLight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EditProfileSheet extends StatefulWidget {
  final UserModel user;
  const _EditProfileSheet({required this.user});

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _lastNameCtrl;
  late final TextEditingController _phoneCtrl;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _firstNameCtrl = TextEditingController(text: widget.user.firstName);
    _lastNameCtrl = TextEditingController(text: widget.user.lastName);
    _phoneCtrl = TextEditingController(text: widget.user.phone ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<ProfileBloc>().add(ProfileUpdateRequested(
          firstName: _firstNameCtrl.text.trim(),
          lastName: _lastNameCtrl.text.trim(),
          phone: _phoneCtrl.text.trim(),
        ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Edit Profile',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildField(
              controller: _firstNameCtrl,
              label: 'First Name',
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            _buildField(
              controller: _lastNameCtrl,
              label: 'Last Name',
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            _buildField(
              controller: TextEditingController(text: widget.user.email),
              label: 'Email',
              readOnly: true,
            ),
            const SizedBox(height: 12),
            _buildField(
              controller: _phoneCtrl,
              label: 'Phone',
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submit,
                child: const Text('Save Changes'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    bool readOnly = false,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      readOnly: readOnly,
      keyboardType: keyboardType,
      validator: validator,
      style: TextStyle(
        color: readOnly ? AppTheme.textSecondary : AppTheme.textPrimary,
      ),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: readOnly ? AppTheme.background : Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.border),
        ),
      ),
    );
  }
}

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _showCurrent = false;
  bool _showNew = false;
  bool _showConfirm = false;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<ProfileBloc>().add(ProfileChangePasswordRequested(
          currentPassword: _currentCtrl.text,
          newPassword: _newCtrl.text,
        ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Change Password',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildPasswordField(
              controller: _currentCtrl,
              label: 'Current Password',
              show: _showCurrent,
              onToggle: () => setState(() => _showCurrent = !_showCurrent),
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            _buildPasswordField(
              controller: _newCtrl,
              label: 'New Password',
              show: _showNew,
              onToggle: () => setState(() => _showNew = !_showNew),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (v.length < 8) return 'Minimum 8 characters';
                return null;
              },
            ),
            const SizedBox(height: 12),
            _buildPasswordField(
              controller: _confirmCtrl,
              label: 'Confirm New Password',
              show: _showConfirm,
              onToggle: () => setState(() => _showConfirm = !_showConfirm),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (v != _newCtrl.text) return 'Passwords do not match';
                return null;
              },
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submit,
                child: const Text('Change Password'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool show,
    required VoidCallback onToggle,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: !show,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.border),
        ),
        suffixIcon: IconButton(
          onPressed: onToggle,
          icon: Icon(show ? Icons.visibility_off : Icons.visibility),
        ),
      ),
    );
  }
}
