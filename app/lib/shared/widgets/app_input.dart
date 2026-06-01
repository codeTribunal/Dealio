import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_tokens.dart';
import 'app_text_field.dart';

// Re-export so `AppTextField` and `AppTextArea` are both available from
// `app_input.dart` (the canonical Soft Depth input module).
export 'app_text_field.dart' show AppTextField, appInputDecoration;

/// Multi-line Soft Depth text input — a thin wrapper over [TextFormField]
/// sharing the same decoration as [AppTextField].
class AppTextArea extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final int minLines;
  final int maxLines;
  final bool readOnly;
  final void Function(String)? onChanged;

  const AppTextArea({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.inputFormatters,
    this.validator,
    this.minLines = 3,
    this.maxLines = 6,
    this.readOnly = false,
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
          inputFormatters: inputFormatters,
          validator: validator,
          minLines: minLines,
          maxLines: maxLines,
          readOnly: readOnly,
          onChanged: onChanged,
          keyboardType: TextInputType.multiline,
          style: TextStyle(color: t.text1, fontSize: AppTextSizes.base),
          decoration: appInputDecoration(context, hint: hint),
        ),
      ],
    );
  }
}
