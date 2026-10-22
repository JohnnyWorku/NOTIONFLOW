import 'package:flutter/material.dart';

/// Dependency-free bar chart. [values] are drawn oldest to newest.
class MiniBars extends StatelessWidget {
  final List<num> values;
  final List<String>? labels;
  final double height;
  const MiniBars({super.key, required this.values, this.labels, this.height = 72});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final maxV = values.fold<num>(1, (a, b) => b > a ? b : a);
    return SizedBox(
      height: height,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < values.length; i++)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 1.5),
                child: Tooltip(
                  message: '${labels != null && i < labels!.length ? '${labels![i]}: ' : ''}${values[i]}',
                  child: Container(
                    height: values[i] == 0 ? 3 : (height * (values[i] / maxV)).clamp(5.0, height).toDouble(),
                    decoration: BoxDecoration(
                      color: values[i] == 0 ? cs.surfaceContainerHighest : cs.primary,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
