import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';

/// Soft Depth text field: a thin wrapper over [TextFormField] so existing
/// controllers/validators keep working. Surface fill, hairline border, accent
/// focus border. Optional [leftIcon] renders a leading [AppIcon].
class AppTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final bool obscureText;
  final Widget? suffixIcon;
  final AppIconName? leftIcon;
  final int? maxLines;
  final bool readOnly;
  final VoidCallback? onTap;
  final void Function(String)? onChanged;

  const AppTextField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.keyboardType = TextInputType.text,
    this.inputFormatters,
    this.validator,
    this.obscureText = false,
    this.suffixIcon,
    this.leftIcon,
    this.maxLines = 1,
    this.readOnly = false,
    this.onTap,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: AppTextSizes.caption,
            fontWeight: AppFontWeights.semibold,
            color: t.text2,
          ),
        ),
        const SizedBox(height: AppSpacing.s2),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          validator: validator,
          obscureText: obscureText,
          maxLines: obscureText ? 1 : maxLines,
          readOnly: readOnly,
          onTap: onTap,
          onChanged: onChanged,
          style: TextStyle(color: t.text1, fontSize: AppTextSizes.base),
          decoration: appInputDecoration(
            context,
            hint: hint,
            leftIcon: leftIcon,
            suffixIcon: suffixIcon,
          ),
        ),
      ],
    );
  }
}

/// Shared Soft Depth [InputDecoration] used by [AppTextField] and AppTextArea.
InputDecoration appInputDecoration(
  BuildContext context, {
  String? hint,
  AppIconName? leftIcon,
  Widget? suffixIcon,
}) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: color, width: width),
      );

  return InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(color: t.text3, fontSize: AppTextSizes.base),
    filled: true,
    fillColor: t.surface,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(
      horizontal: AppSpacing.s4,
      vertical: AppSpacing.s3,
    ),
    prefixIcon: leftIcon == null
        ? null
        : Padding(
            padding: const EdgeInsets.only(
              left: AppSpacing.s4,
              right: AppSpacing.s2,
            ),
            child: AppIcon(name: leftIcon, size: 20, color: t.text2),
          ),
    prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
    suffixIcon: suffixIcon,
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
    errorBorder: border(t.error),
    focusedErrorBorder: border(t.error, 2),
  );
}
