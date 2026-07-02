import 'package:flutter/widgets.dart';

/// Observer attached to the ROOT navigator (see [routerProvider]).
///
/// The app's detail/form screens are root-navigator routes pushed OVER the
/// persistent [StatefulShellRoute] shell. Because each shell branch has its own
/// nested navigator, a [RouteAware] inside a branch (e.g. the home screen) never
/// sees those pushes/pops — only the SHELL's own route on the root navigator
/// does. So the shell (MainScaffold) subscribes here to learn when the owner
/// returns to it, which is what drives the home-dashboard refresh-on-focus.
final RouteObserver<ModalRoute<void>> rootRouteObserver =
    RouteObserver<ModalRoute<void>>();
