## Review flow

Before completing a change:

1. Trace the affected flow end to end.
2. Review the diff and any configuration that controls that flow.
3. Test the normal path, failure path, and likely abuse path.
4. Run the same checks CI will run.
5. Report concrete risks or unverified assumptions before calling it complete.